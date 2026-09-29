import React, { useEffect, useMemo, useState } from 'react'
import {
  AppWindow, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, CircleHelp, HardDrive,
  KeyRound, MessageSquare, MonitorSmartphone, PlusCircle, Radio, RefreshCw, RotateCcw,
  ShieldAlert, Tablet, UserRound, Wifi
} from 'lucide-react'
import { supabase } from './lib/supabase'

const STAFF_ROLES = new Set(['patrol', 'dispatcher', 'supervisor', 'admin'])
const PRIORITIES = ['critical','high','normal','low']
const STATUSES = ['open','triage','in_progress','waiting','resolved','closed']
const PRIORITY_META = {
  critical: { level:'P1', label:'Critical' },
  high: { level:'P2', label:'High' },
  normal: { level:'P3', label:'Normal' },
  low: { level:'P4', label:'Low' }
}
const ISSUE_TYPES = [
  {
    key:'password_reset', label:'Login / Password', hint:'Locked out or credentials failing', icon:KeyRound, category:'login_access',
    title:'Password reset / account lockout',
    impacts:[
      { key:'default', label:'I need a password reset', note:'I can continue other duties', priority:'normal' },
      { key:'workaround', label:'I have another way to work', note:'Minor disruption only', priority:'low' },
      { key:'blocked', label:'I cannot access a required system', note:'My duty task is blocked', priority:'high' }
    ]
  },
  {
    key:'radio_failure', label:'Radio', hint:'Transmit, receive or channel issue', icon:Radio, category:'radio',
    title:'Radio communications failure',
    impacts:[
      { key:'default', label:'Communications are degraded', note:'Radio works inconsistently', priority:'high' },
      { key:'backup', label:'I have a working backup radio', note:'I can continue operations', priority:'normal' },
      { key:'no_backup', label:'I cannot communicate', note:'No usable radio or backup', priority:'critical' }
    ]
  },
  {
    key:'mdt_connectivity', label:'MDT', hint:'Computer, cellular or field connection', icon:MonitorSmartphone, category:'mdt',
    title:'MDT connectivity issue',
    impacts:[
      { key:'default', label:'MDT is intermittent', note:'It works some of the time', priority:'high' },
      { key:'backup', label:'I have a usable backup', note:'Another workflow is available', priority:'normal' },
      { key:'no_backup', label:'I have no usable MDT', note:'Required field access is unavailable', priority:'critical' }
    ]
  },
  {
    key:'tablet', label:'Tablet / Phone', hint:'Managed mobile device issue', icon:Tablet, category:'tablet',
    title:'Tablet or mobile device issue',
    impacts:[
      { key:'default', label:'Device is partly usable', note:'Some functions still work', priority:'normal' },
      { key:'backup', label:'I have another device', note:'Work can continue', priority:'low' },
      { key:'blocked', label:'I have no usable device', note:'Required work is blocked', priority:'high' }
    ]
  },
  {
    key:'connectivity', label:'Network', hint:'Internet, hotspot or cellular service', icon:Wifi, category:'connectivity',
    title:'Network connectivity issue',
    impacts:[
      { key:'default', label:'Connection is intermittent', note:'Service comes and goes', priority:'high' },
      { key:'backup', label:'I have another connection', note:'Alternate connectivity works', priority:'normal' },
      { key:'no_backup', label:'I have no connection', note:'Required systems are unreachable', priority:'critical' }
    ]
  },
  {
    key:'software', label:'Application', hint:'Software error, crash or sync issue', icon:AppWindow, category:'software',
    title:'Software or application issue',
    impacts:[
      { key:'default', label:'App is disrupting normal work', note:'Some work is still possible', priority:'normal' },
      { key:'workaround', label:'I have a workaround', note:'I can keep working', priority:'low' },
      { key:'blocked', label:'The required app cannot be used', note:'My task is blocked', priority:'high' }
    ]
  },
  {
    key:'hardware', label:'Equipment', hint:'Hardware, mount, power or accessory', icon:HardDrive, category:'hardware',
    title:'Hardware or equipment issue',
    impacts:[
      { key:'default', label:'Equipment is degraded', note:'Partially usable', priority:'normal' },
      { key:'backup', label:'Backup equipment is available', note:'Operations can continue', priority:'low' },
      { key:'blocked', label:'Required equipment is unavailable', note:'My task is blocked', priority:'high' },
      { key:'safety', label:'Safety-critical equipment is down', note:'No usable backup', priority:'critical' }
    ]
  },
  {
    key:'permissions', label:'Permissions', hint:'Wrong access level or missing rights', icon:ShieldAlert, category:'permissions',
    title:'System permissions issue',
    impacts:[
      { key:'default', label:'Access is wrong', note:'I can still perform most duties', priority:'normal' },
      { key:'workaround', label:'There is an easy workaround', note:'Minimal disruption', priority:'low' },
      { key:'blocked', label:'Required duty task is blocked', note:'I need access to proceed', priority:'high' }
    ]
  },
  {
    key:'other', label:'Something Else', hint:'Any other technical problem', icon:CircleHelp, category:'other',
    title:'Other technical issue',
    impacts:[
      { key:'default', label:'It can wait', note:'Non-urgent issue', priority:'low' },
      { key:'affected', label:'It is affecting normal work', note:'Work is slowed or degraded', priority:'normal' },
      { key:'blocked', label:'I cannot continue the task', note:'Required work is blocked', priority:'high' }
    ]
  }
]

function label(value='') { return value.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase()) }
function nullable(value) { return value || null }
function priorityText(value) { const meta = PRIORITY_META[value] || PRIORITY_META.normal; return `${meta.level} · ${meta.label}` }

export default function TechSupport({ user }) {
  const [profile, setProfile] = useState(null)
  const [tickets, setTickets] = useState([])
  const [shops, setShops] = useState([])
  const [devices, setDevices] = useState([])
  const [staff, setStaff] = useState([])
  const [selected, setSelected] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState({ status:'active', priority:'all' })
  const [form, setForm] = useState({ issue_type:'', impact:'', title:'', description:'', category:'other', priority:'low', shop_id:'', device_id:'' })

  const isStaff = STAFF_ROLES.has(profile?.role)
  const selectedIssue = ISSUE_TYPES.find(i => i.key === form.issue_type) || null
  const selectedImpact = selectedIssue?.impacts.find(i => i.key === form.impact) || null
  const wizardStep = !selectedIssue ? 1 : !selectedImpact ? 2 : 3

  async function load() {
    setLoading(true)
    setMessage('')
    const [p, t, s, d] = await Promise.all([
      supabase.from('profiles').select('id,full_name,call_sign,rank_title,role').eq('id', user.id).single(),
      supabase.from('tech_tickets').select('*,shops(name,unit_number),devices(name,asset_tag),creator:profiles!tech_tickets_created_by_fkey(full_name,call_sign),assignee:profiles!tech_tickets_assigned_to_fkey(full_name,call_sign)').order('created_at',{ascending:false}),
      supabase.from('shops').select('id,name,unit_number').eq('is_active',true).order('name'),
      supabase.from('devices').select('id,name,asset_tag,shop_id,device_type,status').eq('status','active').order('name')
    ])
    setProfile(p.data || null)
    setTickets(t.data || [])
    setShops(s.data || [])
    setDevices(d.data || [])
    if (t.error) setMessage(t.error.message)
    setLoading(false)
  }

  useEffect(() => { load() }, [user.id])

  useEffect(() => {
    if (!isStaff) return
    supabase.from('profiles').select('id,full_name,call_sign,rank_title,role').in('role',['patrol','dispatcher','supervisor','admin']).eq('is_active',true).order('full_name').then(({data}) => setStaff(data || []))
  }, [isStaff])

  const filteredDevices = useMemo(() => form.shop_id ? devices.filter(d => d.shop_id === form.shop_id) : devices, [devices, form.shop_id])
  const filteredTickets = useMemo(() => tickets.filter(t => {
    const statusOk = filters.status === 'all' || (filters.status === 'active' ? !['resolved','closed'].includes(t.status) : t.status === filters.status)
    const priorityOk = filters.priority === 'all' || t.priority === filters.priority
    return statusOk && priorityOk
  }), [tickets, filters])

  function chooseIssue(issue) {
    setForm(current => ({
      ...current,
      issue_type: issue.key,
      impact: '',
      category: issue.category,
      priority: 'low',
      title: !current.title || ISSUE_TYPES.some(item => item.title === current.title) ? issue.title : current.title
    }))
  }

  function chooseImpact(impact) {
    setForm(current => ({ ...current, impact:impact.key, priority:impact.priority }))
  }

  function resetForm() {
    setForm({ issue_type:'', impact:'', title:'', description:'', category:'other', priority:'low', shop_id:'', device_id:'' })
    setSubmittedTicket(null)
  }

  function closeWizard() {
    resetForm()
    setNewOpen(false)
  }

  async function submitTicket(e) {
    e.preventDefault()
    setMessage('')
    if (!selectedIssue || !selectedImpact) return setMessage('Finish the issue and impact steps first.')
    setSubmitting(true)
    const payload = {
      created_by: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      shop_id: nullable(form.shop_id),
      device_id: nullable(form.device_id)
    }
    const { data, error } = await supabase.from('tech_tickets').insert(payload).select('id,ticket_number,title,status,priority,created_at').single()
    setSubmitting(false)
    if (error) return setMessage(error.message)
    setSubmittedTicket(data)
    await load()
  }

  async function updateTicket(ticket, patch) {
    const next = { ...patch }
    if ('status' in patch) next.resolved_at = ['resolved','closed'].includes(patch.status) ? (ticket.resolved_at || new Date().toISOString()) : null
    const { data, error } = await supabase.from('tech_tickets').update(next).eq('id',ticket.id).select().single()
    if (error) return setMessage(error.message)
    setTickets(current => current.map(t => t.id === ticket.id ? { ...t, ...data } : t))
    setSelected(current => current?.id === ticket.id ? { ...current, ...data } : current)
  }

  if (selected) return <TicketDetail ticket={selected} user={user} isStaff={isStaff} staff={staff} onBack={() => setSelected(null)} onUpdate={updateTicket}/>

  return <div className="support-workspace">
    {!newOpen && <section className="support-launch">
      <div>
        <span className="system-kicker"><i/> SUPPORT CHANNEL READY</span>
        <p className="eyebrow">FIELD TECH</p>
        <h2>What broke?</h2>
        <p>Tell Patrol Command what stopped working. We'll handle the category and response level for you.</p>
      </div>
      <button className="support-launch-button" onClick={()=>{resetForm();setNewOpen(true)}}><PlusCircle size={25}/><span><small>START</small>Report an issue</span><ArrowRight size={20}/></button>
    </section>}

    {newOpen && <section className="triage-console">
      <div className="triage-topbar">
        <button type="button" className="triage-close" onClick={closeWizard}><ArrowLeft size={18}/> Exit</button>
        <div className="triage-progress" aria-label="Ticket progress">
          {['Issue','Impact','Details','Sent'].map((name,index)=>{
            const number=index+1
            const active=submittedTicket ? number<=4 : number<=wizardStep
            const current=submittedTicket ? number===4 : number===wizardStep
            return <div key={name} className={(active?'active ':'')+(current?'current':'')}><span>{active && number < (submittedTicket?4:wizardStep) ? '✓' : number}</span><small>{name}</small></div>
          })}
        </div>
      </div>

      {submittedTicket ? <section className="ticket-receipt">
        <div className="receipt-check"><CheckCircle2 size={42}/></div>
        <p className="eyebrow">RECEIVED</p>
        <h2>Ticket #{submittedTicket.ticket_number}</h2>
        <p>Your issue is in the support queue. You can return to patrol.</p>
        <div className="receipt-strip"><div><span>Response level</span><strong>{PRIORITY_META[submittedTicket.priority]?.label || 'Normal'}</strong></div><div><span>Status</span><strong>{label(submittedTicket.status)}</strong></div></div>
        <div className="receipt-actions"><button className="primary" onClick={closeWizard}>Return to support</button><button className="ghost" onClick={()=>{resetForm();setNewOpen(true)}}><RotateCcw size={17}/> Report another</button></div>
      </section> : <form className="triage-wizard" onSubmit={submitTicket}>
        {wizardStep===1 && <section className="wizard-stage">
          <div className="wizard-copy"><span>STEP 01</span><h2>What stopped working?</h2><p>Pick the thing that's giving you trouble.</p></div>
          <div className="issue-console-grid">
            {ISSUE_TYPES.map(issue=>{const Icon=issue.icon;return <button key={issue.key} type="button" className="issue-console-choice" onClick={()=>chooseIssue(issue)}>
              <div className="issue-console-icon"><Icon size={24}/></div><div><strong>{issue.label}</strong><span>{issue.hint}</span></div><ArrowRight size={18}/>
            </button>})}
          </div>
        </section>}

        {wizardStep===2 && selectedIssue && <section className="wizard-stage">
          <button className="wizard-back" type="button" onClick={()=>setForm(current=>({...current,issue_type:'',impact:''}))}><ChevronLeft size={17}/> Change issue</button>
          <div className="wizard-copy"><span>STEP 02 · {selectedIssue.label.toUpperCase()}</span><h2>How badly is it affecting the shift?</h2><p>Choose the statement that best matches what's happening right now.</p></div>
          <div className="impact-console-list">
            {selectedIssue.impacts.map(impact=><button key={impact.key} type="button" onClick={()=>chooseImpact(impact)}>
              <div className="impact-pulse"/><div><strong>{impact.label}</strong><span>{impact.note}</span></div><ArrowRight size={18}/>
            </button>)}
          </div>
        </section>}

        {wizardStep===3 && selectedIssue && selectedImpact && <section className="wizard-stage">
          <button className="wizard-back" type="button" onClick={()=>setForm(current=>({...current,impact:''}))}><ChevronLeft size={17}/> Change impact</button>
          <div className="wizard-copy"><span>STEP 03 · DETAILS</span><h2>Give support the useful part.</h2><p>Just enough detail to understand the problem and where it's happening.</p></div>
          <div className="triage-summary"><div><span>Issue</span><strong>{selectedIssue.label}</strong></div><div><span>Impact</span><strong>{selectedImpact.label}</strong></div><div className={'response-dot '+form.priority}><span/> Response level set automatically</div></div>
          <div className="form-grid">
            <label>Shop / unit<select value={form.shop_id} onChange={e=>setForm({...form,shop_id:e.target.value,device_id:''})}><option value="">Not specified</option>{shops.map(s=><option key={s.id} value={s.id}>{s.name}{s.unit_number ? ` · ${s.unit_number}` : ''}</option>)}</select></label>
            <label>Device<select value={form.device_id} onChange={e=>setForm({...form,device_id:e.target.value})}><option value="">Not specified</option>{filteredDevices.map(d=><option key={d.id} value={d.id}>{d.name}{d.asset_tag ? ` · ${d.asset_tag}` : ''}</option>)}</select></label>
          </div>
          <label>Short title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength="120" placeholder="Example: Shop 12 MDT will not connect"/></label>
          <label>What happened?<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows="5" placeholder="What were you trying to do? What happened? What have you already tried?"/></label>
          <button className="submit-command" type="submit" disabled={submitting}>{submitting?'Sending to support…':<>Send to support <ArrowRight size={19}/></>}</button>
          {message && <p className="form-message panel-message">{message}</p>}
        </section>}
      </form>}
    </section>}

    {!newOpen && <>
      {message && <p className="form-message panel-message">{message}</p>}
      {isStaff && <section className="ticket-filters">
        <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="active">Active queue</option><option value="all">All</option>{STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label>Priority<select value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})}><option value="all">All priorities</option>{PRIORITIES.map(p=><option key={p} value={p}>{priorityText(p)}</option>)}</select></label>
        <button className="refresh-queue" onClick={load}><RefreshCw size={16}/> Refresh</button>
      </section>}

      <section className="ticket-queue">
        <div className="queue-heading"><div><p className="eyebrow">{isStaff?'SUPPORT DESK':'MY ACTIVITY'}</p><h3>{isStaff?'Active queue':'Your tickets'}</h3></div><span>{filteredTickets.length}</span></div>
        {loading ? <p className="empty">Loading tickets…</p> : filteredTickets.length === 0 ? <div className="queue-clear"><CheckCircle2 size={28}/><strong>Queue clear.</strong><span>No matching tickets right now.</span></div> : filteredTickets.map(ticket => (
          <button className="queue-ticket" key={ticket.id} onClick={() => setSelected(ticket)}>
            <div className={'queue-priority '+ticket.priority}>{PRIORITY_META[ticket.priority]?.level || 'P3'}</div>
            <div className="queue-ticket-copy"><span>#{ticket.ticket_number} · {ticket.shops?.name || 'Field'}</span><strong>{ticket.title}</strong><small>{ticket.devices?.name || label(ticket.category)}{isStaff ? ` · ${ticket.creator?.call_sign || ticket.creator?.full_name || 'Unknown'}` : ''}</small></div>
            <div className="queue-ticket-state"><span className={'status '+ticket.status}>{label(ticket.status)}</span><ArrowRight size={17}/></div>
          </button>
        ))}
      </section>
    </>}
  </div>
}

function TicketDetail({ ticket, user, isStaff, staff, onBack, onUpdate }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [message, setMessage] = useState('')

  async function loadComments() {
    const { data, error } = await supabase.from('ticket_comments').select('*,author:profiles!ticket_comments_author_id_fkey(full_name,call_sign,rank_title)').eq('ticket_id',ticket.id).order('created_at')
    if (error) setMessage(error.message)
    else setComments(data || [])
  }
  useEffect(() => { loadComments() }, [ticket.id])

  async function addComment(e) {
    e.preventDefault()
    if (!body.trim()) return
    const { error } = await supabase.from('ticket_comments').insert({ ticket_id:ticket.id, author_id:user.id, body:body.trim(), is_internal:isStaff && internal })
    if (error) return setMessage(error.message)
    setBody(''); setInternal(false); await loadComments()
  }

  return <div className="stack ticket-detail">
    <button className="back" onClick={onBack}><ChevronLeft size={18}/> Back to tickets</button>
    <section className="panel ticket-detail-head">
      <div><p className="eyebrow">TICKET #{ticket.ticket_number}</p><h2>{ticket.title}</h2><p className="muted">{label(ticket.category)} · {priorityText(ticket.priority)} · {new Date(ticket.created_at).toLocaleString()}</p></div>
      <span className={'status ' + ticket.status}>{label(ticket.status)}</span>
    </section>

    <section className="panel ticket-facts">
      <div><span>Shop</span><strong>{ticket.shops?.name || 'Not specified'}</strong></div>
      <div><span>Device</span><strong>{ticket.devices?.name || 'Not specified'}</strong></div>
      <div><span>Assigned</span><strong>{ticket.assignee?.call_sign || ticket.assignee?.full_name || 'Unassigned'}</strong></div>
    </section>

    <section className="panel"><div className="section-title"><span>Issue description</span></div><p className="ticket-description">{ticket.description}</p></section>

    {isStaff && <section className="panel staff-controls">
      <div className="section-title"><span>Staff controls</span></div>
      <div className="form-grid">
        <label>Status<select value={ticket.status} onChange={e=>onUpdate(ticket,{status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label>Priority override<select value={ticket.priority} onChange={e=>onUpdate(ticket,{priority:e.target.value})}>{PRIORITIES.map(p=><option key={p} value={p}>{priorityText(p)}</option>)}</select></label>
        <label>Assign to<select value={ticket.assigned_to || ''} onChange={e=>onUpdate(ticket,{assigned_to:nullable(e.target.value)})}><option value="">Unassigned</option>{staff.map(p=><option key={p.id} value={p.id}>{p.call_sign || p.full_name || p.rank_title || p.role}</option>)}</select></label>
      </div>
      <label>Resolution notes<textarea defaultValue={ticket.resolution || ''} rows="4" placeholder="Document the fix or next action." onBlur={e=>{ if(e.target.value !== (ticket.resolution || '')) onUpdate(ticket,{resolution:nullable(e.target.value.trim())}) }}/></label>
    </section>}

    <section className="panel comments-panel">
      <div className="section-title"><span><MessageSquare size={18}/> Activity & comments</span></div>
      {comments.length === 0 ? <p className="empty">No comments yet.</p> : comments.map(c=><article className={'comment ' + (c.is_internal ? 'internal' : '')} key={c.id}><div><UserRound size={16}/><strong>{c.author?.call_sign || c.author?.full_name || 'User'}</strong>{c.is_internal && <span className="badge important">Internal</span>}</div><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString()}</small></article>)}
      <form className="comment-form" onSubmit={addComment}><label>Add comment<textarea value={body} onChange={e=>setBody(e.target.value)} rows="3" placeholder="Add an update or troubleshooting note"/></label>{isStaff && <label className="check-line"><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)}/> Internal staff note</label>}<button className="primary inline">Post comment</button></form>
      {message && <p className="form-message">{message}</p>}
    </section>
  </div>
}

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, MessageSquare, PlusCircle, RefreshCw, ShieldAlert, UserRound } from 'lucide-react'
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
    key:'password_reset', label:'Password reset / locked out', category:'login_access', priority:'normal',
    title:'Password reset / account lockout',
    impacts:[
      { key:'default', label:'Standard password reset', priority:'normal' },
      { key:'workaround', label:'Can continue work with a workaround', priority:'low' },
      { key:'blocked', label:'Locked out of a required work system', priority:'high' }
    ]
  },
  {
    key:'radio_failure', label:'Radio not working', category:'radio', priority:'high',
    title:'Radio communications failure',
    impacts:[
      { key:'default', label:'Radio problem; communications are degraded', priority:'high' },
      { key:'backup', label:'Working backup radio is available', priority:'normal' },
      { key:'no_backup', label:'No working backup; officer communications unavailable', priority:'critical' }
    ]
  },
  {
    key:'mdt_connectivity', label:'MDT / cellular connection', category:'mdt', priority:'high',
    title:'MDT connectivity issue',
    impacts:[
      { key:'default', label:'MDT is degraded or intermittently connected', priority:'high' },
      { key:'backup', label:'A usable backup device or workflow is available', priority:'normal' },
      { key:'no_backup', label:'No usable MDT or backup connection', priority:'critical' }
    ]
  },
  {
    key:'permissions', label:'Permissions / access level', category:'permissions', priority:'normal',
    title:'System permissions issue',
    impacts:[
      { key:'default', label:'Access is incorrect but work can continue', priority:'normal' },
      { key:'workaround', label:'Minor access issue with an easy workaround', priority:'low' },
      { key:'blocked', label:'Required duty task is blocked', priority:'high' }
    ]
  },
  {
    key:'tablet', label:'Tablet / mobile device', category:'tablet', priority:'normal',
    title:'Tablet or mobile device issue',
    impacts:[
      { key:'default', label:'Device is degraded but partially usable', priority:'normal' },
      { key:'backup', label:'Working backup device is available', priority:'low' },
      { key:'blocked', label:'No usable device for required work', priority:'high' }
    ]
  },
  {
    key:'software', label:'Software / application', category:'software', priority:'normal',
    title:'Software or application issue',
    impacts:[
      { key:'default', label:'Application issue affecting normal work', priority:'normal' },
      { key:'workaround', label:'Workaround is available', priority:'low' },
      { key:'blocked', label:'Required application cannot be used', priority:'high' }
    ]
  },
  {
    key:'hardware', label:'Hardware / equipment', category:'hardware', priority:'normal',
    title:'Hardware or equipment issue',
    impacts:[
      { key:'default', label:'Equipment is degraded', priority:'normal' },
      { key:'backup', label:'Working backup equipment is available', priority:'low' },
      { key:'blocked', label:'Required equipment is unavailable', priority:'high' },
      { key:'safety', label:'Safety-critical equipment has no usable backup', priority:'critical' }
    ]
  },
  {
    key:'connectivity', label:'Internet / network connectivity', category:'connectivity', priority:'high',
    title:'Network connectivity issue',
    impacts:[
      { key:'default', label:'Connectivity is degraded or intermittent', priority:'high' },
      { key:'backup', label:'Alternate connection is available', priority:'normal' },
      { key:'no_backup', label:'No usable connection for required field systems', priority:'critical' }
    ]
  },
  {
    key:'other', label:'Other technical issue', category:'other', priority:'low',
    title:'Other technical issue',
    impacts:[
      { key:'default', label:'Non-urgent issue', priority:'low' },
      { key:'affected', label:'Issue is affecting normal work', priority:'normal' },
      { key:'blocked', label:'Required work is blocked', priority:'high' }
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
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState({ status:'active', priority:'all' })
  const [form, setForm] = useState({ issue_type:'', impact:'', title:'', description:'', category:'other', priority:'low', shop_id:'', device_id:'' })

  const isStaff = STAFF_ROLES.has(profile?.role)
  const selectedIssue = ISSUE_TYPES.find(i => i.key === form.issue_type) || null

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
      impact: issue.impacts[0].key,
      category: issue.category,
      priority: issue.impacts[0].priority,
      title: !current.title || ISSUE_TYPES.some(item => item.title === current.title) ? issue.title : current.title
    }))
  }

  function chooseImpact(impact) {
    setForm(current => ({ ...current, impact:impact.key, priority:impact.priority }))
  }

  function resetForm() {
    setForm({ issue_type:'', impact:'', title:'', description:'', category:'other', priority:'low', shop_id:'', device_id:'' })
  }

  async function submitTicket(e) {
    e.preventDefault()
    setMessage('')
    if (!selectedIssue) return setMessage('Select an issue type first.')
    const payload = {
      created_by: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      shop_id: nullable(form.shop_id),
      device_id: nullable(form.device_id)
    }
    const { error } = await supabase.from('tech_tickets').insert(payload)
    if (error) return setMessage(error.message)
    resetForm()
    setNewOpen(false)
    setMessage(`Ticket submitted as ${priorityText(form.priority)}.`)
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

  return <div className="stack support-workspace">
    <section className="support-actions">
      <button className="primary inline" onClick={() => { if (newOpen) resetForm(); setNewOpen(v => !v) }}><PlusCircle size={18}/>{newOpen ? 'Cancel' : 'New tech ticket'}</button>
      <button className="ghost compact-action" onClick={load}><RefreshCw size={17}/> Refresh</button>
    </section>

    {newOpen && <form className="panel ticket-form support-form" onSubmit={submitTicket}>
      <div className="section-title"><span>Report a technical issue</span></div>

      <div className="triage-section">
        <span className="field-label">1. What is the issue?</span>
        <div className="issue-grid">
          {ISSUE_TYPES.map(issue => <button key={issue.key} type="button" className={'issue-choice ' + (form.issue_type === issue.key ? 'selected' : '')} onClick={() => chooseIssue(issue)}>{issue.label}</button>)}
        </div>
      </div>

      {selectedIssue && <div className="triage-section">
        <span className="field-label">2. What is the operational impact?</span>
        <div className="impact-list">
          {selectedIssue.impacts.map(impact => <button key={impact.key} type="button" className={'impact-choice ' + (form.impact === impact.key ? 'selected' : '')} onClick={() => chooseImpact(impact)}>
            <span>{impact.label}</span><strong>{priorityText(impact.priority)}</strong>
          </button>)}
        </div>
        <div className={'priority-result priority-' + form.priority}>
          <span>Automatic priority</span>
          <strong>{priorityText(form.priority)}</strong>
          <small>Calculated from issue type and operational impact. Staff can override it after submission.</small>
        </div>
      </div>}

      <div className="form-grid">
        <label>Shop / unit<select value={form.shop_id} onChange={e=>setForm({...form,shop_id:e.target.value,device_id:''})}><option value="">Not specified</option>{shops.map(s=><option key={s.id} value={s.id}>{s.name}{s.unit_number ? ` · ${s.unit_number}` : ''}</option>)}</select></label>
        <label>Device<select value={form.device_id} onChange={e=>setForm({...form,device_id:e.target.value})}><option value="">Not specified</option>{filteredDevices.map(d=><option key={d.id} value={d.id}>{d.name}{d.asset_tag ? ` · ${d.asset_tag}` : ''}</option>)}</select></label>
      </div>
      <label>Issue title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength="120" placeholder="Short description of the problem"/></label>
      <label>What is happening?<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows="5" placeholder="Describe the problem, what you were trying to do, and anything you already tried."/></label>
      <button className="primary" type="submit" disabled={!selectedIssue}>Submit {selectedIssue ? priorityText(form.priority) : ''} ticket</button>
    </form>}

    {message && <p className="form-message panel-message">{message}</p>}

    {isStaff && <section className="ticket-filters">
      <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="active">Active queue</option><option value="all">All</option>{STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
      <label>Priority<select value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})}><option value="all">All priorities</option>{PRIORITIES.map(p=><option key={p} value={p}>{priorityText(p)}</option>)}</select></label>
    </section>}

    <section className="panel">
      <div className="section-title"><span>{isStaff ? 'Tech support queue' : 'My tech tickets'}</span><span className="queue-count">{filteredTickets.length}</span></div>
      {loading ? <p className="empty">Loading tickets…</p> : filteredTickets.length === 0 ? <div className="empty-state"><ShieldAlert size={25}/><p>No matching tickets.</p></div> : filteredTickets.map(ticket => (
        <button className="ticket-row ticket-button" key={ticket.id} onClick={() => setSelected(ticket)}>
          <div className="ticket-main"><strong>#{ticket.ticket_number} · {ticket.title}</strong><span>{ticket.shops?.name || 'No shop'}{ticket.devices?.name ? ` · ${ticket.devices.name}` : ''} · {priorityText(ticket.priority)}</span>{isStaff && <small>Submitted by {ticket.creator?.call_sign || ticket.creator?.full_name || 'Unknown'}</small>}</div>
          <span className={'status ' + ticket.status}>{label(ticket.status)}</span>
        </button>
      ))}
    </section>
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

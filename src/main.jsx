import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Bell,
  BookOpen,
  ChevronLeft,
  CircleUserRound,
  GraduationCap,
  Headphones,
  Home,
  LogOut,
  MonitorSmartphone,
  PlusCircle,
  Radio,
  Search,
  Shield,
  TriangleAlert,
  Wrench
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const NAV = [
  ['home', Home, 'Home'],
  ['accounts', BookOpen, 'Accounts'],
  ['training', GraduationCap, 'Training'],
  ['support', Headphones, 'Support'],
  ['devices', MonitorSmartphone, 'Devices'],
  ['shops', Radio, 'Shops'],
  ['troubleshooting', Wrench, 'Help']
]

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setBusy(false)
  }

  async function resetPassword() {
    if (!email) {
      setMessage('Enter your email address first.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/patrolapp/'
    })
    setMessage(error ? error.message : 'Password reset email sent.')
    setBusy(false)
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <Brand />
        <div className="login-copy">
          <p className="eyebrow">SECURE FIELD ACCESS</p>
          <h1>Patrol Command</h1>
          <p className="muted">Operations, training, account information and technical support in one place.</p>
        </div>
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <button className="ghost" type="button" onClick={resetPassword} disabled={busy}>Forgot password</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
    </main>
  )
}

function Brand({ compact = false }) {
  return (
    <div className={'brand-lockup ' + (compact ? 'compact' : '')}>
      <div className="brand-mark"><Shield size={compact ? 24 : 30} /></div>
      <div><strong>PATROL COMMAND</strong><span>FIELD OPERATIONS</span></div>
    </div>
  )
}

function Shell({ user }) {
  const [page, setPage] = useState('home')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
  }, [user.id])

  const title = NAV.find(([id]) => id === page)?.[2] || 'Patrol Command'

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => setPage('home')}><Brand compact /></button>
        <div className="top-actions">
          <div className="user-pill"><CircleUserRound size={17}/><span>{profile?.rank_title || profile?.role || 'User'}</span></div>
          <button className="icon-button" onClick={() => supabase.auth.signOut()} aria-label="Sign out"><LogOut size={19}/></button>
        </div>
      </header>

      <section className="page-heading">
        {page !== 'home' && <button className="back" onClick={() => setPage('home')}><ChevronLeft size={18}/> Home</button>}
        <p className="eyebrow">NEVADA OPERATIONS</p>
        <h1>{title}</h1>
      </section>

      <section className="content">
        {page === 'home' && <Dashboard profile={profile} go={setPage} />}
        {page === 'accounts' && <Accounts />}
        {page === 'training' && <Training />}
        {page === 'support' && <Support user={user} />}
        {page === 'devices' && <Devices />}
        {page === 'shops' && <Shops />}
        {page === 'troubleshooting' && <Troubleshooting />}
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        {NAV.slice(0, 5).map(([id, Icon, label]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
            <Icon size={20}/><span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

function Dashboard({ profile, go }) {
  const [announcements, setAnnouncements] = useState([])
  const [tickets, setTickets] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('announcements').select('id,title,body,priority').order('created_at', { ascending: false }).limit(3),
      supabase.from('tech_tickets').select('id,ticket_number,title,status,priority,created_at').order('created_at', { ascending: false }).limit(5)
    ]).then(([a, t]) => {
      setAnnouncements(a.data || [])
      setTickets(t.data || [])
    })
  }, [])

  const tiles = [
    ['accounts', BookOpen, 'Accounts & Post Orders', 'Current instructions, contacts and access notes'],
    ['training', GraduationCap, 'Training', 'Guides, policy references and training material'],
    ['support', Headphones, 'Tech Support', 'Submit and track technical support tickets'],
    ['devices', MonitorSmartphone, 'Devices', 'MDTs, tablets, hotspots and equipment'],
    ['shops', Radio, 'Shops & Radios', 'Vehicle and communications reference'],
    ['troubleshooting', Wrench, 'Troubleshooting', 'Fast fixes for common field problems']
  ]

  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">ON DUTY RESOURCE CENTER</p>
          <h2>Welcome{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}.</h2>
          <p className="muted">One source of truth for field operations, training and technical support.</p>
        </div>
        <div className="command-badge"><Shield size={32}/><span>COMMAND</span></div>
      </section>

      {announcements.length > 0 && (
        <section className="panel">
          <div className="section-title"><span><Bell size={18}/> Announcements</span></div>
          {announcements.map(a => (
            <article className="notice" key={a.id}>
              <div><strong>{a.title}</strong><p>{a.body}</p></div>
              <span className={'badge ' + a.priority}>{a.priority}</span>
            </article>
          ))}
        </section>
      )}

      <section className="tile-grid">
        {tiles.map(([id, Icon, title, subtitle]) => (
          <button className="tile" key={id} onClick={() => go(id)}>
            <div className="tile-icon"><Icon size={24}/></div>
            <div><strong>{title}</strong><span>{subtitle}</span></div>
          </button>
        ))}
      </section>

      <section className="panel">
        <div className="section-title"><span><Headphones size={18}/> Recent tech tickets</span><button className="text-button" onClick={() => go('support')}>View all</button></div>
        {tickets.length === 0 ? <p className="empty">No tickets yet.</p> : tickets.map(t => (
          <TicketRow ticket={t} key={t.id}/>
        ))}
      </section>
    </>
  )
}

function Accounts() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    supabase.from('accounts').select('*').order('name').then(({ data }) => setItems(data || []))
  }, [])

  useEffect(() => {
    if (!selected) return setOrders([])
    supabase.from('post_orders').select('*').eq('account_id', selected.id).order('version', { ascending: false }).then(({ data }) => setOrders(data || []))
  }, [selected])

  if (selected) return (
    <div className="stack">
      <button className="back" onClick={() => setSelected(null)}><ChevronLeft size={18}/> All accounts</button>
      <section className="panel account-hero">
        <p className="eyebrow">{selected.code || 'ACCOUNT'}</p>
        <h2>{selected.name}</h2>
        <p>{[selected.address, selected.city, selected.state, selected.postal_code].filter(Boolean).join(', ')}</p>
        {selected.primary_contact_name && <p className="muted">Primary contact: {selected.primary_contact_name}{selected.primary_contact_phone ? ' · ' + selected.primary_contact_phone : ''}</p>}
      </section>
      {(selected.emergency_notes || selected.access_notes) && <section className="panel warning-panel">
        <TriangleAlert size={20}/>
        <div>{selected.emergency_notes && <p><strong>Emergency:</strong> {selected.emergency_notes}</p>}{selected.access_notes && <p><strong>Access:</strong> {selected.access_notes}</p>}</div>
      </section>}
      <section className="panel">
        <div className="section-title"><span>Post orders</span></div>
        {orders.length === 0 ? <p className="empty">No published post orders are available.</p> : orders.map(o => (
          <article className="document-card" key={o.id}><strong>{o.title}</strong><span>Version {o.version}</span><p>{o.content}</p></article>
        ))}
      </section>
    </div>
  )

  const filtered = items.filter(x => (x.name + ' ' + (x.code || '')).toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="stack">
      <SearchBox value={query} onChange={setQuery} placeholder="Search accounts"/>
      <section className="list">
        {filtered.length === 0 ? <Empty text="No accounts available."/> : filtered.map(a => (
          <button className="list-card" key={a.id} onClick={() => setSelected(a)}>
            <div><strong>{a.name}</strong><span>{a.code || [a.city, a.state].filter(Boolean).join(', ')}</span></div><ChevronLeft className="rotate" size={18}/>
          </button>
        ))}
      </section>
    </div>
  )
}

function Training() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  useEffect(() => {
    supabase.from('training_resources').select('*').order('category').order('title').then(({ data }) => setItems(data || []))
  }, [])
  const filtered = items.filter(x => (x.title + ' ' + x.category + ' ' + (x.description || '')).toLowerCase().includes(query.toLowerCase()))
  return <div className="stack">
    <SearchBox value={query} onChange={setQuery} placeholder="Search training"/>
    {filtered.length === 0 ? <Empty text="No training resources available."/> : filtered.map(x => (
      <article className="resource-card" key={x.id}>
        <div className="resource-icon"><GraduationCap size={21}/></div>
        <div><p className="eyebrow">{x.category}</p><h3>{x.title}</h3>{x.description && <p>{x.description}</p>}{x.url && <a href={x.url} target="_blank" rel="noreferrer">Open resource</a>}</div>
        {x.is_required && <span className="badge important">Required</span>}
      </article>
    ))}
  </div>
}

function Support({ user }) {
  const [tickets, setTickets] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', category:'other', priority:'normal' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data } = await supabase.from('tech_tickets').select('*').order('created_at', { ascending:false })
    setTickets(data || [])
  }
  useEffect(() => { load() }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMessage('')
    const { error } = await supabase.from('tech_tickets').insert({
      created_by:user.id,
      title:form.title,
      description:form.description,
      category:form.category,
      priority:form.priority
    })
    if (error) setMessage(error.message)
    else {
      setForm({ title:'', description:'', category:'other', priority:'normal' })
      setOpen(false)
      await load()
    }
    setBusy(false)
  }

  return <div className="stack">
    <button className="primary inline" onClick={() => setOpen(v => !v)}><PlusCircle size={18}/>{open ? 'Cancel' : 'New tech ticket'}</button>
    {open && <form className="panel ticket-form" onSubmit={submit}>
      <label>Issue title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required placeholder="Example: MDT will not connect"/></label>
      <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
        <option value="login_access">Login / access</option><option value="connectivity">Connectivity</option><option value="mdt">MDT</option><option value="tablet">Tablet</option><option value="radio">Radio</option><option value="software">Software</option><option value="hardware">Hardware</option><option value="permissions">Permissions</option><option value="other">Other</option>
      </select></label>
      <label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
      <label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows="5" placeholder="What happened, what device is affected, and what have you already tried?"/></label>
      <button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit ticket'}</button>
      {message && <p className="form-message">{message}</p>}
    </form>}
    <section className="panel">
      <div className="section-title"><span>Tickets</span></div>
      {tickets.length === 0 ? <Empty text="No tickets yet."/> : tickets.map(t => <TicketRow ticket={t} key={t.id}/>)}
    </section>
  </div>
}

function TicketRow({ ticket }) {
  return <article className="ticket-row">
    <div><strong>#{ticket.ticket_number} · {ticket.title}</strong><span>{ticket.priority} priority · {new Date(ticket.created_at).toLocaleDateString()}</span></div>
    <span className={'status ' + ticket.status}>{ticket.status.replaceAll('_',' ')}</span>
  </article>
}

function Devices() {
  const [items, setItems] = useState([])
  useEffect(() => { supabase.from('devices').select('*,shops(name,unit_number)').order('name').then(({data})=>setItems(data||[])) }, [])
  return <section className="list">
    {items.length === 0 ? <Empty text="No devices have been added."/> : items.map(d => (
      <article className="list-card static" key={d.id}><div><strong>{d.name}</strong><span>{d.device_type.toUpperCase()} · {d.asset_tag || 'No asset tag'}{d.shops?.name ? ' · ' + d.shops.name : ''}</span></div><span className={'status ' + (d.status === 'active' ? 'resolved' : 'open')}>{d.status}</span></article>
    ))}
  </section>
}

function Shops() {
  const [items, setItems] = useState([])
  useEffect(() => { supabase.from('shops').select('*').order('name').then(({data})=>setItems(data||[])) }, [])
  return <section className="list">
    {items.length === 0 ? <Empty text="No shops have been added."/> : items.map(s => (
      <article className="list-card static" key={s.id}><div><strong>{s.name}</strong><span>{s.unit_number || 'No unit number'}</span>{s.notes && <p>{s.notes}</p>}</div><span className={'status ' + (s.is_active ? 'resolved' : 'closed')}>{s.is_active ? 'active' : 'inactive'}</span></article>
    ))}
  </section>
}

function Troubleshooting() {
  const guides = [
    ['MDT has no cellular connection', 'Confirm airplane mode is off, check signal indicator, restart the cellular connection or device, then document the shop/unit and symptoms in a tech ticket if service does not return.'],
    ['Unable to sign in', 'Confirm the correct account is being used and verify caps lock. Use the approved password-reset process rather than sharing credentials. Submit a ticket if access or permissions appear incorrect.'],
    ['Radio not communicating', 'Verify the selected channel/talkgroup, volume and antenna connection. Power-cycle the radio if authorized. Escalate persistent coverage or programming issues through a ticket.'],
    ['Tablet or phone will not sync', 'Confirm cellular/Wi-Fi connectivity, close and reopen the affected app, then restart the device. Avoid deleting managed apps or profiles unless instructed by authorized support.']
  ]
  return <div className="stack">{guides.map(([title,body]) => <article className="resource-card" key={title}><div className="resource-icon"><Wrench size={21}/></div><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
}

function SearchBox({ value, onChange, placeholder }) {
  return <label className="search"><Search size={18}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>
}

function Empty({ text }) {
  return <div className="empty-state"><Shield size={26}/><p>{text}</p></div>
}

function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
    }
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!ready) return <div className="boot">Loading Patrol Command…</div>
  return session ? <Shell user={session.user}/> : <Login/>
}

createRoot(document.getElementById('root')).render(<App />)

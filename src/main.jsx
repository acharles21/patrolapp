import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Bell, BookOpen, ChevronLeft, CircleUserRound, GraduationCap, Headphones, Home, LogOut, MonitorSmartphone, Radio, Search, Shield, TriangleAlert, Wrench } from 'lucide-react'
import { supabase } from './lib/supabase'
import TechSupport from './TechSupport'
import './styles.css'
import './tech-support.css'

const NAV = [
  ['home', Home, 'Home'], ['accounts', BookOpen, 'Accounts'], ['training', GraduationCap, 'Training'],
  ['support', Headphones, 'Support'], ['devices', MonitorSmartphone, 'Devices'], ['shops', Radio, 'Shops'], ['troubleshooting', Wrench, 'Help']
]

function Login() {
  const [mode,setMode] = useState('login')
  const [fullName,setFullName] = useState('')
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [confirmPassword,setConfirmPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')

  async function submit(e){
    e.preventDefault()
    setBusy(true)
    setMessage('')

    if(mode === 'signup'){
      if(password.length < 8){
        setMessage('Password must be at least 8 characters.')
        setBusy(false)
        return
      }
      if(password !== confirmPassword){
        setMessage('Passwords do not match.')
        setBusy(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin + '/patrolapp/'
        }
      })

      if(error) setMessage(error.message)
      else if(data.session) setMessage('Account created. Signing you in…')
      else setMessage('Account created. Check your email to confirm your account, then sign in.')

      setBusy(false)
      return
    }

    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error)setMessage(error.message)
    setBusy(false)
  }

  async function resetPassword(){
    if(!email)return setMessage('Enter your email address first.')
    setBusy(true)
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/patrolapp/'})
    setMessage(error?error.message:'Password reset email sent.')
    setBusy(false)
  }

  function switchMode(next){
    setMode(next)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return <main className="login-shell">
    <section className="auth-stage">
      <div className="auth-visual" aria-hidden="true">
        <div className="auth-grid"/>
        <div className="auth-orbit orbit-one"/>
        <div className="auth-orbit orbit-two"/>
        <div className="auth-beacon"><Shield size={34}/></div>
        <div className="auth-visual-copy">
          <span className="system-kicker"><i/> NEVADA FIELD NETWORK</span>
          <h2>Built for the shift.<br/>Ready in the field.</h2>
          <p>One secure command surface for post orders, training, equipment and technical support.</p>
          <div className="auth-feature-row"><span>SECURE ACCESS</span><span>LIVE OPERATIONS</span><span>MOBILE READY</span></div>
        </div>
      </div>
      <section className="login-card">
        <Brand/>
        <div className="login-copy">
          <p className="eyebrow">{mode==='signup'?'NEW OPERATOR':'SECURE FIELD ACCESS'}</p>
          <h1>{mode==='signup'?'Create account':'Welcome back.'}</h1>
          <p className="muted">{mode==='signup'?'Create your Patrol Command login. New accounts begin with standard officer access.':'Sign in to enter Patrol Command.'}</p>
        </div>
        <form onSubmit={submit}>
          {mode==='signup'&&<label>Full name<input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} required autoComplete="name" placeholder="First and last name"/></label>}
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="name@company.com"/></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete={mode==='signup'?'new-password':'current-password'} placeholder="••••••••"/></label>
          {mode==='signup'&&<label>Confirm password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••"/></label>}
          <button className="primary auth-primary" disabled={busy}>{busy?(mode==='signup'?'Creating account…':'Signing in…'):(mode==='signup'?'Create account':'Enter Patrol Command')}</button>
          {mode==='login'&&<button className="ghost" type="button" onClick={resetPassword} disabled={busy}>Forgot password</button>}
          <div className="auth-divider"><span>{mode==='signup'?'Already have an account?':'New to Patrol Command?'}</span></div>
          <button className="ghost auth-switch" type="button" onClick={()=>switchMode(mode==='signup'?'login':'signup')} disabled={busy}>{mode==='signup'?'Back to sign in':'Create an account'}</button>
          {message&&<p className="form-message">{message}</p>}
        </form>
      </section>
    </section>
  </main>
}

function Brand({compact=false}){ return <div className={'brand-lockup '+(compact?'compact':'')}><div className="brand-mark"><Shield size={compact?24:30}/></div><div><strong>PATROL COMMAND</strong><span>FIELD OPERATIONS</span></div></div> }

function Shell({user}) {
  const [page,setPage] = useState('home'); const [profile,setProfile] = useState(null)
  useEffect(()=>{ supabase.from('profiles').select('*').eq('id',user.id).single().then(({data})=>setProfile(data)) },[user.id])
  const title = NAV.find(([id])=>id===page)?.[2] || 'Patrol Command'
  return <main className="app-shell">
    <header className="topbar"><button className="brand-button" onClick={()=>setPage('home')}><Brand compact/></button><div className="top-actions"><div className="network-pill"><i/> ONLINE</div><div className="user-pill"><CircleUserRound size={17}/><span>{profile?.rank_title||profile?.role||'User'}</span></div><button className="icon-button" onClick={()=>supabase.auth.signOut()} aria-label="Sign out"><LogOut size={19}/></button></div></header>
    <section className="page-heading">{page!=='home'&&<button className="back" onClick={()=>setPage('home')}><ChevronLeft size={18}/> Home</button>}<p className="eyebrow">NEVADA OPERATIONS</p><h1>{title}</h1></section>
    <section className="content">{page==='home'&&<Dashboard profile={profile} go={setPage}/>} {page==='accounts'&&<Accounts/>} {page==='training'&&<Training/>} {page==='support'&&<TechSupport user={user}/>} {page==='devices'&&<Devices/>} {page==='shops'&&<Shops/>} {page==='troubleshooting'&&<Troubleshooting/>}</section>
    <nav className="bottom-nav" aria-label="Primary">{NAV.slice(0,5).map(([id,Icon,label])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
  </main>
}

function Dashboard({profile,go}) {
  const [announcements,setAnnouncements]=useState([])
  const [tickets,setTickets]=useState([])

  useEffect(()=>{
    Promise.all([
      supabase.from('announcements').select('id,title,body,priority,created_at').order('created_at',{ascending:false}).limit(3),
      supabase.from('tech_tickets').select('id,ticket_number,title,status,priority,created_at').order('created_at',{ascending:false}).limit(5)
    ]).then(([a,t])=>{setAnnouncements(a.data||[]);setTickets(t.data||[])})
  },[])

  const quickActions=[
    ['accounts',BookOpen,'Post Orders','Briefing'],
    ['support',Headphones,'Report Issue','Support'],
    ['shops',Radio,'Shops & Radios','Equipment'],
    ['training',GraduationCap,'Training','Reference']
  ]
  const openTickets=tickets.filter(t=>!['resolved','closed'].includes(t.status))

  return <div className="shift-console">
    <section className="shift-header">
      <div className="shift-identity">
        <span className="system-kicker"><i/> PATROL COMMAND ONLINE</span>
        <p className="eyebrow">SHIFT CONSOLE</p>
        <h2>{profile?.full_name ? profile.full_name.split(' ')[0] : 'Officer'}, you're in.</h2>
        <p>Start with what matters now. Everything else stays one tap away.</p>
      </div>
      <div className="shift-signal" aria-hidden="true">
        <div className="signal-core"><Shield size={38}/></div>
        <div className="signal-line one"/><div className="signal-line two"/><div className="signal-line three"/>
      </div>
    </section>

    <section className="quick-strip" aria-label="Quick actions">
      {quickActions.map(([id,Icon,title,kicker])=><button key={id} className="quick-command" onClick={()=>go(id)}>
        <div className="quick-command-icon"><Icon size={22}/></div>
        <div><small>{kicker}</small><strong>{title}</strong></div>
        <span>↗</span>
      </button>)}
    </section>

    <section className="ops-layout">
      <div className="briefing-column">
        <div className="section-intro"><div><p className="eyebrow">NOW</p><h3>Shift briefing</h3></div><span>{announcements.length ? announcements.length+' ACTIVE' : 'CLEAR'}</span></div>

        {announcements.length===0 ? <article className="brief-card clear-card"><div className="brief-marker"><Shield size={20}/></div><div><strong>No active briefings.</strong><p>Nothing new requires your attention right now.</p></div></article> :
          announcements.map((a,index)=><article className={'brief-card '+(a.priority||'')} key={a.id}>
            <div className="brief-marker"><span>{String(index+1).padStart(2,'0')}</span></div>
            <div className="brief-body"><div className="brief-meta"><span>{a.priority||'notice'}</span><time>{new Date(a.created_at).toLocaleDateString()}</time></div><strong>{a.title}</strong><p>{a.body}</p></div>
          </article>)}

        <div className="section-intro compact-intro"><div><p className="eyebrow">YOUR SHIFT</p><h3>Recent activity</h3></div><button className="text-button" onClick={()=>go('support')}>View support</button></div>
        <div className="activity-line">
          {tickets.length===0 ? <div className="activity-empty"><span/><p>No ticket activity yet.</p></div> :
            tickets.map(t=><button className="activity-item" key={t.id} onClick={()=>go('support')}>
              <span className={'activity-dot '+t.status}/>
              <div><strong>Ticket #{t.ticket_number}</strong><p>{t.title}</p><small>{t.priority.toUpperCase()} · {t.status.replaceAll('_',' ')}</small></div>
              <time>{new Date(t.created_at).toLocaleDateString()}</time>
            </button>)}
        </div>
      </div>

      <aside className="shift-side">
        <section className="readiness-card">
          <div className="readiness-top"><span>SHIFT STATUS</span><strong>READY</strong></div>
          <div className="readiness-ring"><div><strong>{openTickets.length}</strong><span>open tickets</span></div></div>
          <div className="readiness-list"><div><span>Network</span><strong>Online</strong></div><div><span>Command</span><strong>Available</strong></div><div><span>Resources</span><strong>Synced</strong></div></div>
        </section>

        <section className="reference-stack">
          <p className="eyebrow">REFERENCE</p>
          <button onClick={()=>go('devices')}><MonitorSmartphone size={18}/><div><strong>Devices</strong><span>MDTs, tablets, hotspots</span></div><b>→</b></button>
          <button onClick={()=>go('troubleshooting')}><Wrench size={18}/><div><strong>Fast Fixes</strong><span>Common field problems</span></div><b>→</b></button>
        </section>
      </aside>
    </section>
  </div>
}

function Accounts(){
  const [items,setItems]=useState([]),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[orders,setOrders]=useState([])
  useEffect(()=>{supabase.from('accounts').select('*').order('name').then(({data})=>setItems(data||[]))},[])
  useEffect(()=>{if(!selected)return setOrders([]); supabase.from('post_orders').select('*').eq('account_id',selected.id).order('version',{ascending:false}).then(({data})=>setOrders(data||[]))},[selected])
  if(selected)return <div className="stack"><button className="back" onClick={()=>setSelected(null)}><ChevronLeft size={18}/> All accounts</button><section className="panel account-hero"><p className="eyebrow">{selected.code||'ACCOUNT'}</p><h2>{selected.name}</h2><p>{[selected.address,selected.city,selected.state,selected.postal_code].filter(Boolean).join(', ')}</p>{selected.primary_contact_name&&<p className="muted">Primary contact: {selected.primary_contact_name}{selected.primary_contact_phone?' · '+selected.primary_contact_phone:''}</p>}</section>{(selected.emergency_notes||selected.access_notes)&&<section className="panel warning-panel"><TriangleAlert size={20}/><div>{selected.emergency_notes&&<p><strong>Emergency:</strong> {selected.emergency_notes}</p>}{selected.access_notes&&<p><strong>Access:</strong> {selected.access_notes}</p>}</div></section>}<section className="panel"><div className="section-title"><span>Post orders</span></div>{orders.length===0?<p className="empty">No published post orders are available.</p>:orders.map(o=><article className="document-card" key={o.id}><strong>{o.title}</strong><span>Version {o.version}</span><p>{o.content}</p></article>)}</section></div>
  const filtered=items.filter(x=>(x.name+' '+(x.code||'')).toLowerCase().includes(query.toLowerCase()))
  return <div className="stack"><SearchBox value={query} onChange={setQuery} placeholder="Search accounts"/><section className="list">{filtered.length===0?<Empty text="No accounts available."/>:filtered.map(a=><button className="list-card" key={a.id} onClick={()=>setSelected(a)}><div><strong>{a.name}</strong><span>{a.code||[a.city,a.state].filter(Boolean).join(', ')}</span></div><ChevronLeft className="rotate" size={18}/></button>)}</section></div>
}

function Training(){
  const [items,setItems]=useState([]),[query,setQuery]=useState('')
  useEffect(()=>{supabase.from('training_resources').select('*').order('category').order('title').then(({data})=>setItems(data||[]))},[])
  const filtered=items.filter(x=>(x.title+' '+x.category+' '+(x.description||'')).toLowerCase().includes(query.toLowerCase()))
  return <div className="stack"><SearchBox value={query} onChange={setQuery} placeholder="Search training"/>{filtered.length===0?<Empty text="No training resources available."/>:filtered.map(x=><article className="resource-card" key={x.id}><div className="resource-icon"><GraduationCap size={21}/></div><div><p className="eyebrow">{x.category}</p><h3>{x.title}</h3>{x.description&&<p>{x.description}</p>}{x.url&&<a href={x.url} target="_blank" rel="noreferrer">Open resource</a>}</div>{x.is_required&&<span className="badge important">Required</span>}</article>)}</div>
}

function TicketRow({ticket}){ return <article className="ticket-row"><div><strong>#{ticket.ticket_number} · {ticket.title}</strong><span>{ticket.priority} priority · {new Date(ticket.created_at).toLocaleDateString()}</span></div><span className={'status '+ticket.status}>{ticket.status.replaceAll('_',' ')}</span></article> }

function Devices(){const [items,setItems]=useState([]);useEffect(()=>{supabase.from('devices').select('*,shops(name,unit_number)').order('name').then(({data})=>setItems(data||[]))},[]);return <section className="list">{items.length===0?<Empty text="No devices have been added."/>:items.map(d=><article className="list-card static" key={d.id}><div><strong>{d.name}</strong><span>{d.device_type.toUpperCase()} · {d.asset_tag||'No asset tag'}{d.shops?.name?' · '+d.shops.name:''}</span></div><span className={'status '+(d.status==='active'?'resolved':'open')}>{d.status}</span></article>)}</section>}
function Shops(){const [items,setItems]=useState([]);useEffect(()=>{supabase.from('shops').select('*').order('name').then(({data})=>setItems(data||[]))},[]);return <section className="list">{items.length===0?<Empty text="No shops have been added."/>:items.map(s=><article className="list-card static" key={s.id}><div><strong>{s.name}</strong><span>{s.unit_number||'No unit number'}</span>{s.notes&&<p>{s.notes}</p>}</div><span className={'status '+(s.is_active?'resolved':'closed')}>{s.is_active?'active':'inactive'}</span></article>)}</section>}
function Troubleshooting(){const guides=[['MDT has no cellular connection','Confirm airplane mode is off, check signal indicator, restart the cellular connection or device, then document the shop/unit and symptoms in a tech ticket if service does not return.'],['Unable to sign in','Confirm the correct account is being used and verify caps lock. Use the approved password-reset process rather than sharing credentials. Submit a ticket if access or permissions appear incorrect.'],['Radio not communicating','Verify the selected channel/talkgroup, volume and antenna connection. Power-cycle the radio if authorized. Escalate persistent coverage or programming issues through a ticket.'],['Tablet or phone will not sync','Confirm cellular/Wi-Fi connectivity, close and reopen the affected app, then restart the device. Avoid deleting managed apps or profiles unless instructed by authorized support.']];return <div className="stack">{guides.map(([title,body])=><article className="resource-card" key={title}><div className="resource-icon"><Wrench size={21}/></div><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>}
function SearchBox({value,onChange,placeholder}){return <label className="search"><Search size={18}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
function Empty({text}){return <div className="empty-state"><Shield size={26}/><p>{text}</p></div>}

function App(){
  const [session,setSession]=useState(null),[ready,setReady]=useState(false)
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));let registration;let reloading=false;const activateUpdate=()=>{if(registration?.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});registration?.update().catch(()=>{})};const onControllerChange=()=>{if(reloading)return;reloading=true;window.location.reload()};const register=async()=>{if(!('serviceWorker' in navigator))return;registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});activateUpdate();registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'})})})};window.addEventListener('load',register);window.addEventListener('focus',activateUpdate);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')activateUpdate()});navigator.serviceWorker?.addEventListener('controllerchange',onControllerChange);return()=>{listener.subscription.unsubscribe();window.removeEventListener('load',register);window.removeEventListener('focus',activateUpdate);navigator.serviceWorker?.removeEventListener('controllerchange',onControllerChange)}},[])
  if(!ready)return <div className="boot">Loading Patrol Command…</div>
  return session?<Shell user={session.user}/>:<Login/>
}
createRoot(document.getElementById('root')).render(<App/>)

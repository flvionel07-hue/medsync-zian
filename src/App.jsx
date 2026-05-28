import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from './firebase.js'
import { ref, onValue, set, get } from 'firebase/database'

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  { id: 'dimineata', label: 'Dimineață', icon: '🌅', hour: 7 },
  { id: 'pranz',    label: 'Prânz',     icon: '☀️', hour: 12 },
  { id: 'dupa_masa',label: 'După masă', icon: '🌤️', hour: 15 },
  { id: 'seara',    label: 'Seară',     icon: '🌙', hour: 20 },
]

const CHILD_COLORS = ['#3B82F6','#EC4899','#10B981','#F59E0B','#8B5CF6','#EF4444']
const CHILD_AVATARS = ['🧒','👦','👧','🧑','👶','🐣']

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function generateFamilyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(from, to) {
  const a = new Date(from), b = new Date(to)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function isTreatmentExpired(med) {
  if (!med.startDate || !med.durationDays) return false
  const endDate = addDays(med.startDate, med.durationDays)
  return getTodayKey() > endDate
}

function treatmentDayInfo(med) {
  if (!med.startDate || !med.durationDays) return null
  const today = getTodayKey()
  const dayNum = daysBetween(med.startDate, today) + 1
  const total = med.durationDays
  const remaining = total - dayNum + 1
  const expired = today > addDays(med.startDate, med.durationDays - 1)
  return { dayNum: Math.max(1, dayNum), total, remaining: Math.max(0, remaining), expired }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  app: {
    minHeight: '100dvh',
    background: '#0F1923',
    fontFamily: "'DM Sans', sans-serif",
    color: '#E8EDF2',
    maxWidth: 480,
    margin: '0 auto',
    position: 'relative',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  btn: (color = '#3B82F6') => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '13px 20px',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.15s',
  }),
  btnGhost: {
    background: 'rgba(255,255,255,0.07)',
    color: '#E8EDF2',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '13px 20px',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    cursor: 'pointer',
    width: '100%',
    transition: 'opacity 0.15s',
  },
  input: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    color: '#E8EDF2',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 600,
    marginBottom: 8,
    display: 'block',
  },
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({ onDone }) {
  const [step, setStep] = useState('welcome')
  const [parentName, setParentName] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createFamily = async () => {
    if (!parentName.trim()) return
    setLoading(true)
    const code = generateFamilyCode()
    await set(ref(db, `families/${code}`), {
      code, createdAt: Date.now(),
      children: {}, members: { [parentName.trim()]: { joinedAt: Date.now() } },
    })
    localStorage.setItem('ms_family_code', code)
    localStorage.setItem('ms_parent_name', parentName.trim())
    onDone(code, parentName.trim())
    setLoading(false)
  }

  const joinFamily = async () => {
    const code = codeInput.trim().toUpperCase()
    if (!code || !parentName.trim()) return
    setLoading(true); setError('')
    const snap = await get(ref(db, `families/${code}`))
    if (!snap.exists()) { setError('Cod invalid.'); setLoading(false); return }
    await set(ref(db, `families/${code}/members/${parentName.trim()}`), { joinedAt: Date.now() })
    localStorage.setItem('ms_family_code', code)
    localStorage.setItem('ms_parent_name', parentName.trim())
    onDone(code, parentName.trim())
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0F1923', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      {step === 'welcome' && (
        <div style={{ width:'100%', maxWidth:400, textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:20 }}>💊</div>
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:32, fontWeight:800, marginBottom:8 }}>MedSync</div>
          <div style={{ color:'#64748B', fontSize:16, marginBottom:48, lineHeight:1.6 }}>
            Tracker medicamente pentru copii,<br/>sincronizat cu familia în timp real
          </div>
          <button style={S.btn('#3B82F6')} onClick={() => setStep('name-create')}>Creează familie nouă</button>
          <div style={{ margin:'12px 0', color:'#64748B', fontSize:14 }}>sau</div>
          <button style={S.btnGhost} onClick={() => setStep('name-join')}>Intră cu cod de familie</button>
        </div>
      )}
      {(step === 'name-create' || step === 'name-join') && (
        <div style={{ width:'100%', maxWidth:400 }}>
          <button onClick={() => setStep('welcome')} style={{ background:'none', border:'none', color:'#64748B', cursor:'pointer', marginBottom:24, fontSize:14 }}>← Înapoi</button>
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:24, fontWeight:700, marginBottom:6 }}>
            {step === 'name-create' ? 'Cum te cheamă?' : 'Alătură-te familiei'}
          </div>
          <div style={{ color:'#64748B', fontSize:14, marginBottom:28 }}>
            {step === 'name-create' ? 'Numele tău va apărea când marchezi o doză' : 'Introduceți codul primit de la partener'}
          </div>
          <label style={S.label}>Numele tău</label>
          <input style={{ ...S.input, marginBottom:16 }} placeholder="Ex: Mama, Tata..." value={parentName} onChange={e => setParentName(e.target.value)} autoFocus />
          {step === 'name-join' && (
            <>
              <label style={S.label}>Cod familie</label>
              <input style={{ ...S.input, marginBottom:16, letterSpacing:3, fontSize:18, textTransform:'uppercase' }} placeholder="EX: ABC-123" value={codeInput} onChange={e => setCodeInput(e.target.value)} maxLength={7} />
              {error && <div style={{ color:'#EF4444', fontSize:13, marginBottom:12 }}>{error}</div>}
            </>
          )}
          <button style={S.btn('#3B82F6')} onClick={step === 'name-create' ? createFamily : joinFamily} disabled={loading}>
            {loading ? 'Se creează...' : step === 'name-create' ? 'Continuă →' : 'Intră →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Med Detail Modal ─────────────────────────────────────────────────────────

function MedModal({ med, group, childColor, onClose, onToggleDose, dose, activeSlot, onExtend, onMarkFinished }) {
  const info = treatmentDayInfo(med)
  const fileInputRef = useRef()

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1A2433', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'90dvh', overflowY:'auto' }}>
        {/* Photo area */}
        <div style={{ position:'relative', background:'rgba(255,255,255,0.03)', minHeight:200, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.08)' }}
          onClick={() => fileInputRef.current?.click()}>
          {med.photoBase64 ? (
            <img src={med.photoBase64} alt="medicament" style={{ width:'100%', maxHeight:240, objectFit:'contain' }} />
          ) : (
            <>
              <div style={{ fontSize:48, marginBottom:12 }}>📸</div>
              <div style={{ fontSize:14, color:'#64748B' }}>Apasă pentru a adăuga poza cutiei</div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={async e => {
              const file = e.target.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                const base64 = ev.target.result
                // resize to max 600px wide
                const img = new Image()
                img.onload = () => {
                  const canvas = document.createElement('canvas')
                  const scale = Math.min(1, 600 / img.width)
                  canvas.width = img.width * scale
                  canvas.height = img.height * scale
                  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                  const compressed = canvas.toDataURL('image/jpeg', 0.7)
                  onClose({ ...med, photoBase64: compressed })
                }
                img.src = base64
              }
              reader.readAsDataURL(file)
            }}
          />
          {med.photoBase64 && (
            <div style={{ position:'absolute', bottom:8, right:12, fontSize:11, color:'rgba(255,255,255,0.4)', background:'rgba(0,0,0,0.5)', padding:'3px 8px', borderRadius:6 }}>
              ✏️ schimbă poza
            </div>
          )}
        </div>

        <div style={{ padding:'20px 20px 36px' }}>
          {/* Name + dose */}
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>{med.name}</div>
          {med.dose && <div style={{ fontSize:15, color:childColor, marginBottom:4, fontWeight:500 }}>💊 {med.dose}</div>}
          {med.note && <div style={{ fontSize:14, color:'#94A3B8', marginBottom:16, fontStyle:'italic' }}>📝 {med.note}</div>}

          {/* Treatment progress */}
          {info && (
            <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
              {info.expired ? (
                <div>
                  <div style={{ fontSize:13, color:'#EF4444', fontWeight:600, marginBottom:10 }}>⚠️ Tratament încheiat</div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={onExtend} style={{ ...S.btn('#3B82F6'), fontSize:13, padding:'10px 16px' }}>Prelungește</button>
                    <button onClick={onMarkFinished} style={{ ...S.btnGhost, fontSize:13, padding:'10px 16px' }}>Marchează terminat</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ fontSize:13, color:'#94A3B8' }}>Ziua {info.dayNum} din {info.total}</div>
                    <div style={{ fontSize:13, color: info.remaining <= 2 ? '#F59E0B' : '#10B981', fontWeight:600 }}>
                      {info.remaining === 0 ? 'Ultima zi!' : `${info.remaining} zile rămase`}
                    </div>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background: info.remaining <= 2 ? '#F59E0B' : childColor, width:`${(info.dayNum / info.total) * 100}%`, transition:'width 0.5s' }} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mark dose */}
          {!info?.expired && (
            <button
              onClick={() => { onToggleDose(); onClose() }}
              style={{
                ...S.btn(dose ? '#10B981' : childColor),
                fontSize:16, padding:'16px', fontWeight:700,
                opacity: med.finished ? 0.4 : 1,
              }}
              disabled={med.finished}
            >
              {dose ? `✓ Dat la ${dose.at} de ${dose.by}` : `Marchează doza de ${TIME_SLOTS.find(s=>s.id===activeSlot)?.label}`}
            </button>
          )}
          {med.finished && <div style={{ textAlign:'center', fontSize:13, color:'#475569', marginTop:8 }}>Tratament terminat</div>}

          <button onClick={onClose} style={{ ...S.btnGhost, marginTop:12, fontSize:14 }}>Închide</button>
        </div>
      </div>
    </div>
  )
}

// ─── Add/Edit Med Form ────────────────────────────────────────────────────────

function MedForm({ onSave, onCancel, initial = {} }) {
  const [name, setName] = useState(initial.name || '')
  const [dose, setDose] = useState(initial.dose || '')
  const [note, setNote] = useState(initial.note || '')
  const [slots, setSlots] = useState(initial.slots || ['dimineata'])
  const [durationDays, setDurationDays] = useState(initial.durationDays || '')
  const [startDate, setStartDate] = useState(initial.startDate || getTodayKey())
  const [reminderTime, setReminderTime] = useState(initial.reminderTime || '')

  const toggleSlot = id => setSlots(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  return (
    <div style={{ paddingTop:14 }}>
      <label style={S.label}>Nume medicament *</label>
      <input style={{ ...S.input, marginBottom:12 }} placeholder="Ex: Augmentin, Nurofen..." value={name} onChange={e => setName(e.target.value)} autoFocus />

      <label style={S.label}>Doză</label>
      <input style={{ ...S.input, marginBottom:12 }} placeholder="Ex: 5ml, 1 comprimat, 2 picături" value={dose} onChange={e => setDose(e.target.value)} />

      <label style={S.label}>Notă</label>
      <input style={{ ...S.input, marginBottom:12 }} placeholder="Ex: După mâncare, zdrobit în iaurt..." value={note} onChange={e => setNote(e.target.value)} />

      <label style={S.label}>Intervale</label>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {TIME_SLOTS.map(slot => (
          <button key={slot.id} onClick={() => toggleSlot(slot.id)} style={{
            padding:'6px 12px', borderRadius:10, border:'none', cursor:'pointer',
            fontSize:12, fontFamily:"'DM Sans', sans-serif",
            background: slots.includes(slot.id) ? '#3B82F6' : 'rgba(255,255,255,0.08)',
            color: slots.includes(slot.id) ? '#fff' : '#64748B',
          }}>
            {slot.icon} {slot.label}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Durată (zile)</label>
          <input style={S.input} type="number" placeholder="Ex: 7" min="1" max="90" value={durationDays} onChange={e => setDurationDays(e.target.value)} />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Data start</label>
          <input style={{ ...S.input, colorScheme:'dark' }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
      </div>

      <label style={S.label}>Reminder (oră)</label>
      <input style={{ ...S.input, marginBottom:16, colorScheme:'dark' }} type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} placeholder="Ex: 08:00" />

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => name.trim() && onSave({ name:name.trim(), dose, note, slots, durationDays: durationDays ? parseInt(durationDays) : null, startDate, reminderTime, finished: false })}
          style={{ ...S.btn('#3B82F6'), flex:1 }}>
          Salvează
        </button>
        <button onClick={onCancel} style={{ ...S.btnGhost, flex:1 }}>Anulează</button>
      </div>
    </div>
  )
}

// ─── Extend Modal ─────────────────────────────────────────────────────────────

function ExtendModal({ med, onExtend, onClose }) {
  const [days, setDays] = useState('3')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}>
      <div style={{ background:'#1A2433', borderRadius:20, padding:28, width:'100%', maxWidth:360 }}>
        <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Prelungește tratamentul</div>
        <div style={{ fontSize:14, color:'#64748B', marginBottom:20 }}>{med.name} — cu câte zile?</div>
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {[3,5,7,10].map(d => (
            <button key={d} onClick={() => setDays(String(d))} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer',
              fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:600,
              background: days === String(d) ? '#3B82F6' : 'rgba(255,255,255,0.08)',
              color: days === String(d) ? '#fff' : '#64748B',
            }}>{d}</button>
          ))}
        </div>
        <input style={{ ...S.input, marginBottom:16 }} type="number" value={days} onChange={e => setDays(e.target.value)} min="1" placeholder="Sau introdu manual" />
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => onExtend(parseInt(days))} style={S.btn('#3B82F6')}>Prelungește</button>
          <button onClick={onClose} style={S.btnGhost}>Anulează</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [familyCode, setFamilyCode] = useState(() => localStorage.getItem('ms_family_code'))
  const [parentName, setParentName] = useState(() => localStorage.getItem('ms_parent_name') || '')
  const [familyData, setFamilyData] = useState(null)
  const [activeChild, setActiveChild] = useState(null)
  const [activeSlot, setActiveSlot] = useState(() => {
    const h = new Date().getHours()
    if (h < 10) return 'dimineata'
    if (h < 13) return 'pranz'
    if (h < 17) return 'dupa_masa'
    return 'seara'
  })
  const [activeTab, setActiveTab] = useState('azi')
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAddMed, setShowAddMed] = useState(null)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [selectedMed, setSelectedMed] = useState(null) // { med, groupId }
  const [extendMed, setExtendMed] = useState(null)
  const [newChildName, setNewChildName] = useState('')
  const [newChildAvatar, setNewChildAvatar] = useState(0)
  const [newGroupName, setNewGroupName] = useState('')
  const [chatMsg, setChatMsg] = useState('')
  const todayKey = getTodayKey()

  useEffect(() => {
    if (!familyCode) return
    const r = ref(db, `families/${familyCode}`)
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const data = snap.val()
        setFamilyData(data)
        if (!activeChild && data.children) {
          setActiveChild(Object.keys(data.children)[0])
        }
      }
    })
    return () => unsub()
  }, [familyCode])

  const dbSet = useCallback(async (path, value) => {
    await set(ref(db, `families/${familyCode}/${path}`), value)
  }, [familyCode])

  const dbDel = useCallback(async (path) => {
    await set(ref(db, `families/${familyCode}/${path}`), null)
  }, [familyCode])

  // ── Children ──────────────────────────────────────────────────────────────

  const addChild = async () => {
    if (!newChildName.trim()) return
    const id = Date.now().toString()
    await dbSet(`children/${id}`, {
      id, name: newChildName.trim(),
      avatar: CHILD_AVATARS[newChildAvatar],
      color: CHILD_COLORS[Object.keys(familyData?.children || {}).length % CHILD_COLORS.length],
      groups: {},
    })
    setActiveChild(id)
    setNewChildName('')
    setShowAddChild(false)
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  const addGroup = async () => {
    if (!newGroupName.trim() || !activeChild) return
    const id = Date.now().toString()
    await dbSet(`children/${activeChild}/groups/${id}`, { id, name: newGroupName.trim(), meds: {} })
    setNewGroupName(''); setShowAddGroup(false)
  }

  // ── Meds ──────────────────────────────────────────────────────────────────

  const addMed = async (groupId, medData) => {
    const id = Date.now().toString()
    await dbSet(`children/${activeChild}/groups/${groupId}/meds/${id}`, { id, ...medData })
    setShowAddMed(null)
  }

  const updateMed = async (groupId, medId, medData) => {
    await dbSet(`children/${activeChild}/groups/${groupId}/meds/${medId}`, { id: medId, ...medData })
    setSelectedMed(null)
  }

  const removeMed = async (groupId, medId) => {
    await dbDel(`children/${activeChild}/groups/${groupId}/meds/${medId}`)
  }

  const removeGroup = async (groupId) => {
    await dbDel(`children/${activeChild}/groups/${groupId}`)
  }

  // ── Doses ─────────────────────────────────────────────────────────────────

  const toggleDose = async (groupId, medId, slotId) => {
    const path = `doses/${activeChild}/${todayKey}/${slotId}/${groupId}_${medId}`
    const snap = await get(ref(db, `families/${familyCode}/${path}`))
    if (snap.exists()) {
      await set(ref(db, `families/${familyCode}/${path}`), null)
    } else {
      const timeStr = new Date().toLocaleTimeString('ro-RO', { hour:'2-digit', minute:'2-digit' })
      await set(ref(db, `families/${familyCode}/${path}`), { by: parentName, at: timeStr })
    }
  }

  const getDose = (groupId, medId, slotId, dateKey = todayKey) => {
    return familyData?.doses?.[activeChild]?.[dateKey]?.[slotId]?.[`${groupId}_${medId}`]
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  const sendChat = async () => {
    if (!chatMsg.trim()) return
    const id = Date.now().toString()
    const timeStr = new Date().toLocaleTimeString('ro-RO', { hour:'2-digit', minute:'2-digit' })
    await dbSet(`chat/${id}`, { text: chatMsg.trim(), by: parentName, at: timeStr, date: todayKey })
    setChatMsg('')
  }

  // ── Extend treatment ─────────────────────────────────────────────────────

  const extendTreatment = async (days) => {
    const { med, groupId } = extendMed
    const newEnd = addDays(med.startDate, (med.durationDays || 0) + days)
    const newDuration = daysBetween(med.startDate, newEnd)
    await dbSet(`children/${activeChild}/groups/${groupId}/meds/${med.id}`, { ...med, durationDays: newDuration, finished: false })
    setExtendMed(null); setSelectedMed(null)
  }

  const markFinished = async () => {
    const { med, groupId } = selectedMed
    await dbSet(`children/${activeChild}/groups/${groupId}/meds/${med.id}`, { ...med, finished: true })
    setSelectedMed(null)
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        new Notification('MedSync activat! 💊', { body: 'Vei primi notificări pentru fiecare doză.', icon: '/icon-192.png' })
      }
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!familyCode) {
    return <SetupScreen onDone={(code, name) => { setFamilyCode(code); setParentName(name) }} />
  }
  if (!familyData) {
    return <div style={{ minHeight:'100dvh', background:'#0F1923', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'#64748B' }}>Se conectează...</div></div>
  }

  const children = familyData.children ? Object.values(familyData.children) : []
  const currentChild = children.find(c => c.id === activeChild)
  const groups = currentChild?.groups ? Object.values(currentChild.groups) : []
  const childColor = currentChild?.color || '#3B82F6'

  const totalDosesToday = groups.reduce((acc, g) => acc + Object.values(g.meds||{}).filter(m => !m.finished && !isTreatmentExpired(m)).reduce((a,m) => a + (m.slots?.length||0), 0), 0)
  const doneDosesToday  = groups.reduce((acc, g) => acc + Object.values(g.meds||{}).reduce((a,m) => a + (m.slots||[]).filter(s => getDose(g.id,m.id,s)).length, 0), 0)

  const chatMessages = familyData?.chat ? Object.values(familyData.chat).sort((a,b) => a.date+a.at > b.date+b.at ? 1 : -1) : []
  const todayChat = chatMessages.filter(m => m.date === todayKey)

  const last7 = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10) }).reverse()

  return (
    <div style={S.app}>
      {/* ── Header ── */}
      <div style={{ background:'#0F1923', padding:'52px 20px 0', position:'sticky', top:0, zIndex:50, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14 }}>
          <div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:22, fontWeight:800 }}>💊 MedSync</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:1 }}>Bună, {parentName} 👋</div>
          </div>
          <button onClick={() => setShowCodeModal(true)} style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:10, padding:'7px 12px', color:'#3B82F6', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans', sans-serif", letterSpacing:1 }}>
            🔗 {familyCode}
          </button>
        </div>

        {/* Child selector */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:14 }}>
          {children.map(child => (
            <button key={child.id} onClick={() => setActiveChild(child.id)} style={{
              padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:14, fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap',
              background: activeChild === child.id ? child.color : 'rgba(255,255,255,0.07)',
              color: activeChild === child.id ? '#fff' : '#94A3B8',
              fontWeight: activeChild === child.id ? 600 : 400,
            }}>
              {child.avatar} {child.name}
            </button>
          ))}
          <button onClick={() => setShowAddChild(true)} style={{ padding:'8px 14px', borderRadius:20, border:'1px dashed rgba(255,255,255,0.2)', background:'none', color:'#64748B', cursor:'pointer', fontSize:13, whiteSpace:'nowrap' }}>
            + Copil
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          {[['azi','Azi'],['chat','💬 Chat'],['istoric','Istoric'],['setari','Setări']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex:1, padding:'10px 0', background:'none', border:'none',
              color: activeTab === id ? '#3B82F6' : '#64748B',
              fontSize:13, cursor:'pointer', fontFamily:"'DM Sans', sans-serif",
              fontWeight: activeTab === id ? 600 : 400,
              borderBottom: activeTab === id ? '2px solid #3B82F6' : '2px solid transparent',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'20px 16px 120px' }}>

        {/* AZI */}
        {activeTab === 'azi' && currentChild && (
          <>
            {totalDosesToday > 0 && (
              <div style={{ ...S.card, padding:'16px 20px', marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:13, color:'#94A3B8' }}>Progres azi — {currentChild.name}</div>
                  <div style={{ fontSize:13, fontWeight:600, color: doneDosesToday === totalDosesToday ? '#10B981' : '#F59E0B' }}>
                    {doneDosesToday}/{totalDosesToday}
                  </div>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, background: doneDosesToday === totalDosesToday ? '#10B981' : childColor, width:`${totalDosesToday ? (doneDosesToday/totalDosesToday)*100 : 0}%`, transition:'width 0.5s' }} />
                </div>
              </div>
            )}

            {/* Time slots */}
            <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:20 }}>
              {TIME_SLOTS.map(slot => {
                const slotDone = groups.reduce((acc,g) => acc + Object.values(g.meds||{}).filter(m => m.slots?.includes(slot.id) && getDose(g.id,m.id,slot.id)).length, 0)
                const slotTotal = groups.reduce((acc,g) => acc + Object.values(g.meds||{}).filter(m => m.slots?.includes(slot.id) && !m.finished && !isTreatmentExpired(m)).length, 0)
                return (
                  <button key={slot.id} onClick={() => setActiveSlot(slot.id)} style={{
                    padding:'9px 16px', borderRadius:14, border:'none', cursor:'pointer',
                    fontSize:13, fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap',
                    background: activeSlot === slot.id ? childColor : 'rgba(255,255,255,0.06)',
                    color: activeSlot === slot.id ? '#fff' : '#64748B',
                    fontWeight: activeSlot === slot.id ? 600 : 400,
                  }}>
                    {slot.icon} {slot.label}
                    {slotTotal > 0 && slotDone === slotTotal && <span style={{ marginLeft:5, fontSize:10 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Groups */}
            {groups.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#64748B' }}>
                <div style={{ fontSize:48, marginBottom:16 }}>💊</div>
                <div style={{ fontSize:16, marginBottom:8 }}>Niciun medicament adăugat</div>
                <div style={{ fontSize:13 }}>Adaugă un grup de medicamente mai jos</div>
              </div>
            ) : groups.map(group => {
              const meds = Object.values(group.meds||{}).filter(m => m.slots?.includes(activeSlot))
              return (
                <div key={group.id} style={{ ...S.card, marginBottom:12 }}>
                  <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontFamily:"'Syne', sans-serif", fontWeight:700, fontSize:15 }}>{group.name}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setShowAddMed(group.id)} style={{ background:'rgba(59,130,246,0.15)', border:'none', borderRadius:8, padding:'5px 10px', color:'#3B82F6', cursor:'pointer', fontSize:12 }}>+ Med</button>
                      <button onClick={() => removeGroup(group.id)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ padding:'8px 16px' }}>
                    {meds.length === 0 ? (
                      <div style={{ padding:'12px 0', fontSize:13, color:'#475569', fontStyle:'italic' }}>Niciun medicament pentru {TIME_SLOTS.find(s=>s.id===activeSlot)?.label.toLowerCase()}</div>
                    ) : meds.map(med => {
                      const dose = getDose(group.id, med.id, activeSlot)
                      const info = treatmentDayInfo(med)
                      const expired = info?.expired || false
                      const finished = med.finished

                      return (
                        <div key={med.id}
                          onClick={() => setSelectedMed({ med, groupId: group.id })}
                          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {med.photoBase64 && <img src={med.photoBase64} alt="" style={{ width:32, height:32, borderRadius:6, objectFit:'cover' }} />}
                              <div>
                                <div style={{ fontSize:15, color: (dose||finished||expired) ? '#475569' : '#E8EDF2', textDecoration: (finished||expired) ? 'line-through' : 'none' }}>
                                  {med.name}
                                </div>
                                <div style={{ fontSize:11, color:'#475569', marginTop:2, display:'flex', gap:8 }}>
                                  {med.dose && <span style={{ color:childColor }}>{med.dose}</span>}
                                  {info && !expired && !finished && <span>{info.dayNum}/{info.total} zile</span>}
                                  {(expired || finished) && <span style={{ color:'#EF4444' }}>{finished ? 'Terminat' : '⚠️ Expirat'}</span>}
                                </div>
                              </div>
                            </div>
                            {dose && <div style={{ fontSize:11, color:'#10B981', marginTop:4 }}>✓ {dose.by} · {dose.at}</div>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {!finished && !expired && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleDose(group.id, med.id, activeSlot) }}
                                style={{
                                  padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer',
                                  fontSize:13, fontFamily:"'DM Sans', sans-serif", fontWeight:600,
                                  background: dose ? '#10B981' : 'rgba(255,255,255,0.1)',
                                  color: dose ? '#fff' : '#94A3B8',
                                  transition:'all 0.2s', whiteSpace:'nowrap',
                                }}
                              >
                                {dose ? '✓ Dat' : 'Marchează'}
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); removeMed(group.id, med.id) }} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:12 }}>✕</button>
                          </div>
                        </div>
                      )
                    })}

                    {showAddMed === group.id && (
                      <MedForm onSave={data => addMed(group.id, data)} onCancel={() => setShowAddMed(null)} />
                    )}
                  </div>
                </div>
              )
            })}

            {showAddGroup ? (
              <div style={{ ...S.card, padding:16, marginTop:12 }}>
                <label style={S.label}>Grup nou</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input style={S.input} placeholder="Ex: Antibiotice, Vitamine..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key==='Enter' && addGroup()} autoFocus />
                  <button onClick={addGroup} style={{ ...S.btn('#3B82F6'), width:44, padding:0, borderRadius:12, flexShrink:0 }}>+</button>
                  <button onClick={() => setShowAddGroup(false)} style={{ ...S.btnGhost, width:44, padding:0, borderRadius:12, flexShrink:0 }}>✕</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddGroup(true)} style={{ width:'100%', padding:16, borderRadius:16, border:'1px dashed rgba(255,255,255,0.15)', background:'none', color:'#475569', cursor:'pointer', fontSize:14, marginTop:12, fontFamily:"'DM Sans', sans-serif" }}>
                + Grup nou de medicamente
              </button>
            )}
          </>
        )}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:700, marginBottom:20 }}>Notițe familie</div>
            <div style={{ marginBottom:16 }}>
              {todayChat.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#475569', fontSize:14 }}>Niciun mesaj azi. Trimiteți notițe despre starea copilului.</div>
              ) : todayChat.map((msg, i) => (
                <div key={i} style={{
                  ...S.card, padding:'12px 16px', marginBottom:8,
                  background: msg.by === parentName ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                  borderColor: msg.by === parentName ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{msg.by}</div>
                    <div style={{ fontSize:11, color:'#475569' }}>{msg.at}</div>
                  </div>
                  <div style={{ fontSize:15 }}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, position:'sticky', bottom:20 }}>
              <input style={S.input} placeholder="Ex: A vărsut după doză, temperatură 38°..." value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && sendChat()} />
              <button onClick={sendChat} style={{ ...S.btn(childColor), width:54, padding:0, borderRadius:12, flexShrink:0, fontSize:20 }}>↑</button>
            </div>
          </div>
        )}

        {/* ISTORIC */}
        {activeTab === 'istoric' && currentChild && (
          <div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:700, marginBottom:20 }}>Ultimele 7 zile — {currentChild.name}</div>
            {last7.map(dateKey => {
              const isToday = dateKey === todayKey
              const dayLabel = isToday ? 'Azi' : new Date(dateKey+'T12:00:00').toLocaleDateString('ro-RO', { weekday:'short', day:'numeric', month:'short' })
              const dayDoses = familyData?.doses?.[activeChild]?.[dateKey]
              const allEntries = dayDoses ? Object.entries(dayDoses).flatMap(([slotId, slot]) => Object.entries(slot).map(([k,v]) => ({ slot: slotId, key:k, ...v }))) : []
              return (
                <div key={dateKey} style={{ ...S.card, marginBottom:10, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: allEntries.length ? 10 : 0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color: isToday ? childColor : '#E8EDF2' }}>{dayLabel}</div>
                    <div style={{ fontSize:12, color: allEntries.length ? '#10B981' : '#475569' }}>{allEntries.length} doze</div>
                  </div>
                  {allEntries.map((entry, i) => (
                    <div key={i} style={{ fontSize:12, color:'#64748B', padding:'4px 0', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                      ✓ {TIME_SLOTS.find(s=>s.id===entry.slot)?.label} · {entry.by} · {entry.at}
                    </div>
                  ))}
                  {allEntries.length === 0 && <div style={{ fontSize:12, color:'#334155', fontStyle:'italic' }}>Nicio doză înregistrată</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* SETARI */}
        {activeTab === 'setari' && (
          <div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:700, marginBottom:20 }}>Setări</div>
            <div style={{ ...S.card, padding:'16px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, color:'#64748B', marginBottom:6 }}>Conectat ca</div>
              <div style={{ fontSize:16, fontWeight:600 }}>{parentName}</div>
            </div>
            <div style={{ ...S.card, padding:'16px 20px', marginBottom:12 }}>
              <div style={{ fontSize:13, color:'#64748B', marginBottom:8 }}>Membri familie</div>
              {familyData?.members && Object.keys(familyData.members).map(name => (
                <div key={name} style={{ fontSize:14, padding:'4px 0' }}>👤 {name}</div>
              ))}
            </div>
            <button onClick={requestNotifications} style={{ ...S.btn('rgba(59,130,246,0.15)'), color:'#3B82F6', border:'1px solid rgba(59,130,246,0.3)', marginBottom:12 }}>
              🔔 Activează notificările
            </button>
            <button onClick={() => { localStorage.clear(); window.location.reload() }} style={{ ...S.btnGhost, color:'#EF4444', borderColor:'rgba(239,68,68,0.3)' }}>
              Ieși din familie
            </button>
          </div>
        )}
      </div>

      {/* ── Med Detail Modal ── */}
      {selectedMed && (
        <MedModal
          med={selectedMed.med}
          group={groups.find(g => g.id === selectedMed.groupId)}
          childColor={childColor}
          activeSlot={activeSlot}
          dose={getDose(selectedMed.groupId, selectedMed.med.id, activeSlot)}
          onClose={(updatedMed) => {
            if (updatedMed && updatedMed.id) updateMed(selectedMed.groupId, updatedMed.id, updatedMed)
            else setSelectedMed(null)
          }}
          onToggleDose={() => toggleDose(selectedMed.groupId, selectedMed.med.id, activeSlot)}
          onExtend={() => { setExtendMed(selectedMed); setSelectedMed(null) }}
          onMarkFinished={markFinished}
        />
      )}

      {/* ── Extend Modal ── */}
      {extendMed && (
        <ExtendModal med={extendMed.med} onExtend={extendTreatment} onClose={() => setExtendMed(null)} />
      )}

      {/* ── Add Child Modal ── */}
      {showAddChild && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end', zIndex:100 }}>
          <div style={{ background:'#1A2433', borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:480, margin:'0 auto' }}>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, marginBottom:20 }}>Adaugă copil</div>
            <label style={S.label}>Nume</label>
            <input style={{ ...S.input, marginBottom:16 }} placeholder="Ex: Zian, Maria..." value={newChildName} onChange={e => setNewChildName(e.target.value)} autoFocus />
            <label style={S.label}>Avatar</label>
            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              {CHILD_AVATARS.map((av,i) => (
                <button key={i} onClick={() => setNewChildAvatar(i)} style={{ fontSize:24, padding:8, borderRadius:10, border: newChildAvatar===i ? '2px solid #3B82F6' : '2px solid transparent', background:'rgba(255,255,255,0.07)', cursor:'pointer' }}>
                  {av}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button style={S.btn('#3B82F6')} onClick={addChild}>Adaugă</button>
              <button style={S.btnGhost} onClick={() => setShowAddChild(false)}>Anulează</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Code Modal ── */}
      {showCodeModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:24 }}>
          <div style={{ background:'#1A2433', borderRadius:20, padding:28, width:'100%', maxWidth:360, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔗</div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>Cod familie</div>
            <div style={{ fontSize:13, color:'#64748B', marginBottom:20, lineHeight:1.6 }}>Trimite acest cod soției/soțului pe WhatsApp.</div>
            <div style={{ fontFamily:"'Syne', sans-serif", fontSize:36, fontWeight:800, letterSpacing:6, color:'#3B82F6', background:'rgba(59,130,246,0.1)', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
              {familyCode}
            </div>
            <button onClick={() => navigator.clipboard?.writeText(familyCode)} style={{ ...S.btn('#3B82F6'), marginBottom:10 }}>📋 Copiază codul</button>
            <button onClick={() => setShowCodeModal(false)} style={S.btnGhost}>Închide</button>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { 
  Heart, Shield, Users, Brain, Sparkles, Phone, MessageSquare, 
  Settings, CheckCircle, RefreshCw, Music, Coffee, Sun, CloudRain, 
  Flame, TreePine, Award, Bell, Activity, Pill, Mic, Video, Volume2, 
  ChevronRight, Calendar, UserCheck, Zap, Lock, Globe
} from 'lucide-react'
import confetti from 'canvas-confetti'

export default function App() {
  const [activeTab, setActiveTab] = useState('home') // 'home', 'games', 'buddies', 'care', 'telehealth'
  
  // --- Game 1: Emotion Match State ---
  const emotions = [
    { name: 'Happy', emoji: '😊', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
    { name: 'Calm', emoji: '😌', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { name: 'Excited', emoji: '⭐', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
    { name: 'Cozy', emoji: '🧸', bg: 'bg-purple-100 text-purple-900 border-purple-300' }
  ]
  const [targetEmotion, setTargetEmotion] = useState(emotions[0])
  const [gameScore, setGameScore] = useState(0)
  const [feedback, setFeedback] = useState('')

  // --- Game 2: Sensory Soundscape ---
  const [playingSound, setPlayingSound] = useState(null)
  const soundscapes = [
    { id: 'rain', name: 'Rain', icon: '🌧️', bg: 'from-blue-500 to-indigo-600' },
    { id: 'ocean', name: 'Waves', icon: '🌊', bg: 'from-cyan-500 to-blue-600' },
    { id: 'forest', name: 'Forest', icon: '🌲', bg: 'from-emerald-500 to-teal-600' },
    { id: 'fire', name: 'Hearth', icon: '🔥', bg: 'from-amber-500 to-orange-600' }
  ]

  // --- Routine Checklist ---
  const [routines, setRoutines] = useState([
    { id: 1, text: 'Morning Water 💧', done: true },
    { id: 2, text: 'Calm Game 🧩', done: false },
    { id: 3, text: 'Coffee Circle ☕', done: false },
    { id: 4, text: 'Rest & Breathe 🌿', done: false }
  ])

  // --- Medication List ---
  const [meds, setMeds] = useState([
    { id: 1, name: 'Lisinopril (Blood Pressure)', time: '8:00 AM', taken: true },
    { id: 2, name: 'Vitamin D3 & Calcium', time: '12:30 PM', taken: false },
    { id: 3, name: 'Donepezil (Memory Support)', time: '8:00 PM', taken: false }
  ])

  const toggleMed = (id) => {
    setMeds(meds.map(m => m.id === id ? { ...m, taken: !m.taken } : m))
    confetti({ particleCount: 20 })
  }

  const handlePickEmotion = (emo) => {
    if (emo.name === targetEmotion.name) {
      setGameScore(s => s + 1)
      setFeedback('✨ Wonderful!')
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } })
      setTimeout(() => {
        const next = emotions[Math.floor(Math.random() * emotions.length)]
        setTargetEmotion(next)
        setFeedback('')
      }, 1000)
    } else {
      setFeedback('Try again 💙')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navigation Bar (Best-in-Class Web App Header) */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              💚
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  CareSphere AI
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Pro 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Senior Care, Isolation Prevention & Autism Support Platform</p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60">
            {[
              { id: 'home', label: 'Overview', icon: Sparkles },
              { id: 'games', label: 'Autism & Sensory', icon: Brain },
              { id: 'buddies', label: 'Coffee Circles', icon: Coffee },
              { id: 'care', label: 'Caregiver Hub', icon: Shield },
              { id: 'telehealth', label: 'Telehealth & AI', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Right SOS Action */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => alert("🚨 Emergency SOS Dispatched! Family and Response Coordinator notified with live GPS coordinates.")}
              className="bg-red-600/90 hover:bg-red-600 text-white px-4 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-red-500/30 flex items-center space-x-1.5 animate-pulse"
            >
              <span>🚨 SOS Emergency</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Nav */}
        <div className="flex md:hidden overflow-x-auto pt-3 pb-1 space-x-2 border-t border-slate-800/80 mt-3">
          {[
            { id: 'home', label: 'Home' },
            { id: 'games', label: 'Games' },
            { id: 'buddies', label: 'Circles' },
            { id: 'care', label: 'Care' },
            { id: 'telehealth', label: 'AI Health' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* --- TAB 1: OVERVIEW / DASHBOARD --- */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border border-emerald-500/30 p-8 sm:p-12 shadow-2xl">
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>The #1 Proactive Senior Care & Autism Wellness Platform</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                  Empowering Independent Living & Neurodiversity
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Combining AI-powered isolation prevention, real-time caregiver coordination, medication adherence tracking, and sensory-calming autism therapeutic games into one seamless app.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab('games')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg transition"
                  >
                    Play Autism & Sensory Games 🧩
                  </button>
                  <button 
                    onClick={() => setActiveTab('buddies')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-2xl text-xs border border-slate-700 transition"
                  >
                    Join Coffee Circles ☕
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid (Outperforming Market Standards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Isolation Risk</div>
                <div className="text-2xl font-black text-emerald-400">Low (Connected)</div>
                <p className="text-xs text-slate-500">2 coffee circles attended today</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medication Adherence</div>
                <div className="text-2xl font-black text-white">95% On-Time</div>
                <p className="text-xs text-emerald-400">1 dose pending for tonight</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Autism Therapy Score</div>
                <div className="text-2xl font-black text-indigo-400">92% Accuracy</div>
                <p className="text-xs text-slate-500">Emotion recognition session done</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Health Status</div>
                <div className="text-2xl font-black text-emerald-400">Stable Vitals</div>
                <p className="text-xs text-slate-500">122/78 BP • 7.5h sleep</p>
              </div>

            </div>

            {/* Daily Routine & Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Routine Checklist */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Predictable Daily Routine</h3>
                  <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-semibold">
                    {routines.filter(r => r.done).length} / {routines.length} Completed
                  </span>
                </div>
                <div className="space-y-2.5">
                  {routines.map(r => (
                    <div 
                      key={r.id}
                      onClick={() => {
                        setRoutines(routines.map(x => x.id === r.id ? { ...x, done: !x.done } : x))
                        confetti({ particleCount: 15 })
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                        r.done ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 line-through' : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <span className="font-semibold text-sm">{r.text}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${r.done ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-slate-600'}`}>
                        {r.done && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medication Reminder Widget */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Today's Medications</h3>
                  <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full font-semibold">
                    Smart Reminders Active
                  </span>
                </div>
                <div className="space-y-2.5">
                  {meds.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl border transition ${m.taken ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-rose-950/30 border-rose-500/30 text-slate-100'}`}>
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => toggleMed(m.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition ${m.taken ? 'bg-emerald-500 text-slate-950 font-bold' : 'border border-rose-400'}`}
                        >
                          {m.taken && '✓'}
                        </button>
                        <div>
                          <div className={`font-bold text-sm ${m.taken ? 'line-through text-slate-500' : 'text-white'}`}>{m.name}</div>
                          <div className="text-xs text-slate-400">Scheduled: {m.time}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${m.taken ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-300'}`}>
                        {m.taken ? 'Taken' : 'Due'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 2: AUTISM & SENSORY GAMES --- */}
        {activeTab === 'games' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Autism Support & Sensory Games</h2>
                <p className="text-xs sm:text-sm text-slate-400">Clutter-free, sensory-regulated emotional recognition and focus.</p>
              </div>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-2xl font-extrabold">
                Score: {gameScore} 🌟
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Emotion Match Game */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">Emotion Recognition Match</span>
                  <div className="text-6xl font-black py-6 bg-slate-950 rounded-2xl border border-slate-800 inline-block px-10 shadow-inner">
                    {targetEmotion.emoji}
                  </div>
                  <div className="text-lg font-bold text-indigo-300">Find the face: {targetEmotion.name}</div>
                  {feedback && <div className="text-sm font-black text-emerald-400 animate-bounce">{feedback}</div>}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  {emotions.map((emo, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePickEmotion(emo)}
                      className="py-5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-2xl text-3xl flex items-center justify-center transition shadow-lg hover:scale-105"
                    >
                      {emo.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensory Soundscapes */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-extrabold">Sensory Soundscapes</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold">
                      {playingSound ? 'Playing 🎧' : 'Paused'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Calming Ambient Audio</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Designed to ground neurodivergent users and seniors experiencing sensory overload or anxiety.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {soundscapes.map(snd => (
                    <button
                      key={snd.id}
                      onClick={() => {
                        setPlayingSound(playingSound === snd.id ? null : snd.id)
                        confetti({ particleCount: 20 })
                      }}
                      className={`p-4 rounded-2xl bg-gradient-to-r ${snd.bg} text-white font-bold text-sm flex items-center justify-between shadow-lg transition ${playingSound === snd.id ? 'ring-2 ring-white scale-105' : 'opacity-90 hover:opacity-100'}`}
                    >
                      <span>{snd.icon} {snd.name}</span>
                      <span>{playingSound === snd.id ? '⏸️' : '▶️'}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 3: COFFEE CIRCLES & ISOLATION PREVENTION --- */}
        {activeTab === 'buddies' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Virtual Coffee Circles & Isolation Prevention</h2>
                <p className="text-xs sm:text-sm text-slate-400">Live social rooms, buddy matching, and warm family voice updates.</p>
              </div>
              <button 
                onClick={() => alert("Hosting new coffee circle room...")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition"
              >
                + Host Room
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Morning Sunshine Tea & Chat', time: 'Live Now', people: '8 participants', host: 'Sarah M.', icon: '☕' },
                { title: 'Classic Movie Trivia Hour', time: '2:00 PM Today', people: '14 participants', host: 'David K.', icon: '🎬' },
                { title: 'Gentle Stretching & Breathing', time: '4:30 PM Today', people: '11 participants', host: 'Elena R.', icon: '🌿' }
              ].map((room, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{room.icon}</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-500/30">
                        {room.time}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{room.title}</h3>
                    <p className="text-xs text-slate-400">Hosted by <span className="text-slate-200 font-semibold">{room.host}</span> • {room.people}</p>
                  </div>
                  <button 
                    onClick={() => alert(`Joining "${room.title}"! Connecting secure audio-video room...`)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-2xl text-xs shadow transition"
                  >
                    Join Room 🚀
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* --- TAB 4: CAREGIVER HUB --- */}
        {activeTab === 'care' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Caregiver & Family Management Hub</h2>
                <p className="text-xs sm:text-sm text-slate-400">Real-time remote monitoring, collaborative notes, and peace of mind.</p>
              </div>
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-2xl font-bold">
                Secure 256-bit Encrypted
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                <h3 className="text-lg font-bold text-white">Shared Care Notes & Log</h3>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Add a care note for family or doctor..." 
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={() => alert("Care note posted successfully!")}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow transition"
                  >
                    Post Note
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { author: 'Dr. Evelyn Vance', time: 'Today, 9:15 AM', note: 'Blood pressure stable (122/78). Recommended continued morning walks.' },
                    { author: 'Family Caregiver', time: 'Yesterday', note: 'Completed 3 emotion recognition sessions with 92% accuracy.' }
                  ].map((note, i) => (
                    <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>{note.author}</span>
                        <span className="text-slate-500">{note.time}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/30 rounded-3xl p-6 space-y-4">
                <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-yellow-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Care Insights</span>
                </div>
                <h3 className="text-lg font-bold text-white">Proactive Recommendations</h3>
                <ul className="space-y-3 text-xs text-indigo-200 leading-relaxed">
                  <li>• Senior social isolation risk score dropped by 18% this week due to coffee circle participation.</li>
                  <li>• Autism therapy game completion is 100% on schedule.</li>
                  <li>• All vitals and medication reminders operating smoothly.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 5: TELEHEALTH & AI HEALTH --- */}
        {activeTab === 'telehealth' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">AI Telehealth & Remote Monitoring</h2>
                <p className="text-xs sm:text-sm text-slate-400">Secure virtual consultations and automated vital sign analytics.</p>
              </div>
              <button 
                onClick={() => alert("Launching secure telehealth video room with physician...")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg transition flex items-center space-x-2"
              >
                <Video className="w-4 h-4" />
                <span>Start Virtual Visit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="text-emerald-400 font-bold text-xs uppercase">Heart Rate Monitor</div>
                <div className="text-3xl font-black text-white">72 <span className="text-xs text-slate-400 font-normal">BPM (Normal)</span></div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[65%]"></div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="text-emerald-400 font-bold text-xs uppercase">Oxygen Saturation (SpO2)</div>
                <div className="text-3xl font-black text-white">98% <span className="text-xs text-slate-400 font-normal">Optimal</span></div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[90%]"></div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="text-emerald-400 font-bold text-xs uppercase">Sleep Analysis</div>
                <div className="text-3xl font-black text-white">7.5 hrs <span className="text-xs text-emerald-400 font-normal">Restful</span></div>
                <div className="text-xs text-slate-500">Deep sleep: 2h 15m • Rem: 1h 45m</div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center space-x-2 font-bold text-slate-300">
          <span>💚 CareSphere AI — Best-in-Class Proactive Senior Care & Autism Platform</span>
        </div>
        <p>Outperforming market standards with integrated AI telemetry, isolation prevention coffee circles, and sensory autism games.</p>
      </footer>

    </div>
  )
}

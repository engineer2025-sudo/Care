import React, { useState } from 'react'
import { 
  Heart, Smile, Volume2, Shield, Users, Brain, Sparkles, Phone, MessageSquare, 
  Settings, CheckCircle, RefreshCw, Music, Coffee, Sun, CloudRain, Flame, TreePine, Award
} from 'lucide-react'
import confetti from 'canvas-confetti'

export default function App() {
  const [deviceMode, setDeviceMode] = useState('ios') // 'ios', 'android', 'web'
  const [activeTab, setActiveTab] = useState('home') // 'home', 'games', 'buddies', 'care'
  
  // Game 1: Emotion Match State
  const emotions = [
    { name: 'Happy', emoji: '😊', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
    { name: 'Calm', emoji: '😌', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { name: 'Excited', emoji: '⭐', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
    { name: 'Cozy', emoji: '🧸', bg: 'bg-purple-100 text-purple-900 border-purple-300' }
  ]
  const [targetEmotion, setTargetEmotion] = useState(emotions[0])
  const [gameScore, setGameScore] = useState(0)
  const [feedback, setFeedback] = useState('')

  // Game 2: Sensory Soundscape
  const [playingSound, setPlayingSound] = useState(null)
  const soundscapes = [
    { id: 'rain', name: 'Rain', icon: '🌧️', bg: 'from-blue-500 to-indigo-600' },
    { id: 'ocean', name: 'Waves', icon: '🌊', bg: 'from-cyan-500 to-blue-600' },
    { id: 'forest', name: 'Forest', icon: '🌲', bg: 'from-emerald-500 to-teal-600' },
    { id: 'fire', name: 'Hearth', icon: '🔥', bg: 'from-amber-500 to-orange-600' }
  ]

  // Routine Checkbox
  const [routines, setRoutines] = useState([
    { id: 1, text: 'Morning Water 💧', done: true },
    { id: 2, text: 'Calm Game 🧩', done: false },
    { id: 3, text: 'Coffee Circle ☕', done: false },
    { id: 4, text: 'Rest & Breathe 🌿', done: false }
  ])

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6 font-sans">
      
      {/* Top Device Switcher Toolbar */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-wide text-slate-200">CareSphere Calm</span>
        </div>
        <div className="flex bg-slate-800 p-1 rounded-xl space-x-1">
          <button 
            onClick={() => setDeviceMode('ios')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${deviceMode === 'ios' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            iOS
          </button>
          <button 
            onClick={() => setDeviceMode('android')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${deviceMode === 'android' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Android
          </button>
          <button 
            onClick={() => setDeviceMode('web')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${deviceMode === 'web' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Web App
          </button>
        </div>
      </div>

      {/* Phone / App Frame Container */}
      <div className={`transition-all duration-300 bg-slate-900 shadow-2xl overflow-hidden flex flex-col relative border-slate-800 ${
        deviceMode === 'ios' 
          ? 'w-full max-w-[390px] h-[844px] rounded-[50px] border-[10px]' 
          : deviceMode === 'android'
          ? 'w-full max-w-[390px] h-[844px] rounded-[36px] border-[8px]'
          : 'w-full max-w-4xl h-[800px] rounded-3xl border'
      }`}>

        {/* Device Status Bar */}
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 z-20">
          <span className="font-bold text-slate-200">9:41</span>
          {deviceMode === 'ios' && <div className="w-28 h-4 bg-slate-950 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2"></div>}
          <div className="flex items-center space-x-2">
            <span>5G</span>
            <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* App Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24 bg-slate-950/80">
          
          {/* TAB 1: HOME / DASHBOARD */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Minimal Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white">Hello, Friend 💚</h1>
                  <p className="text-xs text-slate-400">Calm, clear & connected.</p>
                </div>
                <button 
                  onClick={() => alert("SOS Emergency Alert Dispatched to Family & Care Team.")}
                  className="bg-red-500/20 text-red-400 border border-red-500/40 font-bold px-3 py-1.5 rounded-full text-xs animate-pulse flex items-center space-x-1"
                >
                  <span>🚨 SOS</span>
                </button>
              </div>

              {/* Big Visual Mood Card */}
              <div className="bg-gradient-to-br from-emerald-900/60 to-teal-900/60 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-lg">
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">How do you feel?</span>
                <div className="flex justify-center gap-4 text-3xl">
                  {['😊', '😌', '☕', '🌟'].map((em, i) => (
                    <button 
                      key={i} 
                      onClick={() => {
                        confetti({ particleCount: 20 })
                        alert(`Recorded mood: ${em}`)
                      }}
                      className="w-14 h-14 bg-slate-900/80 rounded-2xl flex items-center justify-center hover:scale-110 transition border border-emerald-500/20 shadow"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Routine Checklist */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Daily Routine</span>
                  <span>{routines.filter(r => r.done).length} / {routines.length}</span>
                </div>
                <div className="space-y-2">
                  {routines.map(r => (
                    <div 
                      key={r.id}
                      onClick={() => setRoutines(routines.map(x => x.id === r.id ? { ...x, done: !x.done } : x))}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
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

              {/* Quick Jump to Autism Games & Senior Care */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('games')}
                  className="p-5 rounded-3xl bg-indigo-950/60 border border-indigo-500/30 text-left space-y-2 hover:bg-indigo-900/40 transition group"
                >
                  <div className="text-2xl group-hover:scale-110 transition w-fit">🧩</div>
                  <div className="font-bold text-sm text-indigo-200">Autism Games</div>
                  <p className="text-xs text-slate-400">Calm emotion & focus</p>
                </button>

                <button 
                  onClick={() => setActiveTab('buddies')}
                  className="p-5 rounded-3xl bg-amber-950/60 border border-amber-500/30 text-left space-y-2 hover:bg-amber-900/40 transition group"
                >
                  <div className="text-2xl group-hover:scale-110 transition w-fit">☕</div>
                  <div className="font-bold text-sm text-amber-200">Coffee Circles</div>
                  <p className="text-xs text-slate-400">Zero isolation</p>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: AUTISM THERAPEUTIC GAMES */}
          {activeTab === 'games' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Calm & Focus Games</h2>
                  <p className="text-xs text-slate-400">Zero clutter, sensory-friendly.</p>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold">
                  Score: {gameScore}
                </span>
              </div>

              {/* Emotion Match Game */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Find this feeling:</span>
                <div className="text-5xl font-black py-4 bg-slate-950 rounded-2xl border border-slate-800 inline-block px-8">
                  {targetEmotion.emoji}
                </div>
                <div className="text-sm font-bold text-indigo-300">{targetEmotion.name}</div>

                {feedback && <div className="text-xs font-bold text-emerald-400 animate-bounce">{feedback}</div>}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {emotions.map((emo, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePickEmotion(emo)}
                      className="py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-2xl flex items-center justify-center transition shadow"
                    >
                      {emo.emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sensory Soundscape Minibox */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Sensory Soundscapes</span>
                <div className="grid grid-cols-2 gap-3">
                  {soundscapes.map(snd => (
                    <button
                      key={snd.id}
                      onClick={() => {
                        setPlayingSound(playingSound === snd.id ? null : snd.id)
                        confetti({ particleCount: 15 })
                      }}
                      className={`p-3.5 rounded-2xl bg-gradient-to-r ${snd.bg} text-white font-bold text-xs flex items-center justify-between shadow transition ${playingSound === snd.id ? 'ring-2 ring-white' : 'opacity-90'}`}
                    >
                      <span>{snd.icon} {snd.name}</span>
                      <span>{playingSound === snd.id ? '⏸️' : '▶️'}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SENIOR CARE & COFFEE CIRCLES */}
          {activeTab === 'buddies' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Isolation Prevention</h2>
                  <p className="text-xs text-slate-400">Coffee circles & buddy chats.</p>
                </div>
                <button 
                  onClick={() => alert("Hosting coffee room...")}
                  className="bg-amber-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs"
                >
                  + Host
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'Morning Sunshine Tea', time: 'Live Now', people: '8 peers', icon: '☕' },
                  { title: 'Classic Movie Memories', time: '2:00 PM', people: '12 peers', icon: '🎬' },
                  { title: 'Gentle Chair Stretch', time: '4:30 PM', people: '10 peers', icon: '🌿' }
                ].map((room, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center text-xl border border-amber-500/20">
                        {room.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{room.title}</h4>
                        <p className="text-xs text-slate-400">{room.time} • {room.people}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Joining ${room.title}...`)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CAREGIVER HUB */}
          {activeTab === 'care' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-white">Caregiver Hub</h2>
                <p className="text-xs text-slate-400">Simple peace of mind.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Isolation Risk</div>
                  <div className="text-lg font-black text-emerald-400">Low (Connected)</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-1">
                  <div className="text-xs text-slate-400 font-semibold">Meds Taken</div>
                  <div className="text-lg font-black text-white">2 / 3 doses</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">AI Care Insights</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Grandma joined 2 coffee circles this week. Autism therapy emotion match accuracy at 92%. All vitals normal.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation Bar (iOS / Android Style) */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-6 py-3 flex items-center justify-between z-30">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'home' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('games')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'games' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Brain className="w-5 h-5" />
            <span className="text-[10px] font-bold">Games</span>
          </button>

          <button 
            onClick={() => setActiveTab('buddies')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'buddies' ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Coffee className="w-5 h-5" />
            <span className="text-[10px] font-bold">Circles</span>
          </button>

          <button 
            onClick={() => setActiveTab('care')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'care' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold">Care</span>
          </button>
        </div>

      </div>
    </div>
  )
}

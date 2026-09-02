import React, { useState } from 'react'
import { 
  Users, Heart, Smile, Coffee, Calendar, PhoneCall, Mic, Image as ImageIcon, 
  CheckCircle2, Clock, AlertCircle, Plus, Sparkles, MessageCircle, Volume2, 
  Activity, Pill, ShieldAlert, Award
} from 'lucide-react'

export function SeniorCare({ onOpenJoinCircle, onOpenVoiceNote, onOpenAddMedication }) {
  const [mood, setMood] = useState('Joyful')
  const [checkInDone, setCheckInDone] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState('dashboard')

  // Sample data
  const [circles, setCircles] = useState([
    { id: 1, title: 'Morning Sunshine Coffee Club', time: '10:00 AM Today', participants: 8, host: 'Sarah M. (Volunteer)', category: 'Social & Chat' },
    { id: 2, title: 'Gentle Stretching & Chair Yoga', time: '2:00 PM Today', participants: 12, host: 'David K. (Instructor)', category: 'Wellness' },
    { id: 3, title: 'Classic Movie Trivia & Memories', time: '4:30 PM Today', participants: 15, host: 'Elena R.', category: 'Entertainment' },
    { id: 4, title: 'Weekly Book Club: Inspiring Lives', time: 'Tomorrow, 11:00 AM', participants: 9, host: 'Marcus T.', category: 'Literature' }
  ])

  const [buddies, setBuddies] = useState([
    { id: 1, name: 'Arthur Pendelton (82)', status: 'Connected as Pen Pals', mutual: 'Love gardening & classical music', avatar: '👴' },
    { id: 2, name: 'Student Volunteer Leo (19)', status: 'Weekly Check-in Buddy', mutual: 'University student & chess player', avatar: '🧑‍🎓' },
    { id: 3, name: 'Margaret Vance (78)', status: 'Neighbor & Teatime Friend', mutual: 'Baking & knitting enthusiast', avatar: '👵' }
  ])

  const [familyUpdates, setFamilyUpdates] = useState([
    { id: 1, sender: 'Emily (Granddaughter)', time: '2 hours ago', text: 'Hi Grandma! Sending you a hug from college. Acquired an A on my history midterm!', type: 'voice', duration: '0:42', image: null },
    { id: 2, sender: 'David (Son)', time: 'Yesterday', text: 'Dad, dropping by on Saturday with homemade lasagna and your favorite lemon tart!', type: 'photo', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' }
  ])

  const [medications, setMedications] = useState([
    { id: 1, name: 'Lisinopril (Blood Pressure)', time: '8:00 AM', taken: true, dosage: '10mg' },
    { id: 2, name: 'Vitamin D3 & Calcium', time: '12:30 PM', taken: true, dosage: '1 tablet' },
    { id: 3, name: 'Donepezil (Memory Support)', time: '8:00 PM', taken: false, dosage: '5mg' }
  ])

  const handleCompleteCheckIn = (selectedMood) => {
    setMood(selectedMood)
    setCheckInDone(true)
  }

  const toggleMedication = (id) => {
    setMedications(medications.map(m => m.id === id ? { ...m, taken: !m.taken } : m))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-8 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Proactive Senior Care & Isolation Prevention</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Nurturing Connection, Joy & Daily Well-being
          </h1>
          <p className="text-emerald-50 text-sm sm:text-base leading-relaxed">
            Stay connected with daily check-ins, live social coffee circles, buddy matching, and warm family voice updates designed to eliminate loneliness and keep minds vibrant.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => setActiveSubTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeSubTab === 'dashboard' ? 'bg-white text-emerald-800 shadow' : 'bg-emerald-700/60 text-white hover:bg-emerald-700'}`}
            >
              Today's Well-being
            </button>
            <button 
              onClick={() => setActiveSubTab('circles')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeSubTab === 'circles' ? 'bg-white text-emerald-800 shadow' : 'bg-emerald-700/60 text-white hover:bg-emerald-700'}`}
            >
              ☕ Social Coffee Circles ({circles.length})
            </button>
            <button 
              onClick={() => setActiveSubTab('buddies')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeSubTab === 'buddies' ? 'bg-white text-emerald-800 shadow' : 'bg-emerald-700/60 text-white hover:bg-emerald-700'}`}
            >
              🤝 Isolation Prevention & Buddies
            </button>
            <button 
              onClick={() => setActiveSubTab('family')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeSubTab === 'family' ? 'bg-white text-emerald-800 shadow' : 'bg-emerald-700/60 text-white hover:bg-emerald-700'}`}
            >
              💌 Family Voice Feed
            </button>
          </div>
        </div>
      </div>

      {/* Daily Check-in Card */}
      {!checkInDone ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2 text-emerald-600 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              <span>Daily Morning Check-in • Today</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">How are you feeling today, friend?</h2>
            <p className="text-slate-500 text-sm">Your daily check-in lets your family and care team know you're doing well and keeps isolation at bay.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Joyful 😊', val: 'Joyful', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
              { label: 'Calm 😌', val: 'Calm', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
              { label: 'Lonely ☕', val: 'Lonely', color: 'bg-sky-100 text-sky-800 hover:bg-sky-200' },
              { label: 'Tired 🛌', val: 'Tired', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
            ].map((m) => (
              <button
                key={m.val}
                onClick={() => handleCompleteCheckIn(m.val)}
                className={`px-5 py-3 rounded-2xl font-bold text-sm transition shadow-sm ${m.color}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-2xl shadow">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">Check-in Completed Successfully!</h3>
              <p className="text-emerald-700 text-sm">You recorded your mood as <span className="font-bold">{mood}</span>. Family and community support team notified.</p>
            </div>
          </div>
          <button 
            onClick={() => setCheckInDone(false)}
            className="text-xs text-emerald-700 underline font-semibold hover:text-emerald-900"
          >
            Update mood
          </button>
        </div>
      )}

      {/* Main Content Tabs */}
      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Quick Actions & Health / Vitals */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Health & Medication Schedule */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Today's Medications & Health</h3>
                    <p className="text-xs text-slate-500">Never miss a dose with friendly scheduled prompts</p>
                  </div>
                </div>
                <button 
                  onClick={onOpenAddMedication}
                  className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Reminder</span>
                </button>
              </div>

              <div className="space-y-3">
                {medications.map((med) => (
                  <div key={med.id} className={`flex items-center justify-between p-4 rounded-2xl border transition ${med.taken ? 'bg-slate-50/80 border-slate-200' : 'bg-emerald-50/40 border-emerald-200'}`}>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => toggleMedication(med.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition ${med.taken ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 hover:border-emerald-500'}`}
                      >
                        {med.taken && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div>
                        <h4 className={`font-bold text-sm ${med.taken ? 'line-through text-slate-400' : 'text-slate-800'}`}>{med.name}</h4>
                        <p className="text-xs text-slate-500">{med.dosage} • Scheduled for {med.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${med.taken ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                      {med.taken ? 'Taken' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vitals Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="text-slate-400 text-xs font-semibold">Blood Pressure</div>
                <div className="text-2xl font-extrabold text-slate-800">122 / 78 <span className="text-xs text-emerald-600 font-normal">Normal</span></div>
                <div className="text-xs text-slate-500">Last measured 2 hrs ago</div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="text-slate-400 text-xs font-semibold">Daily Steps</div>
                <div className="text-2xl font-extrabold text-slate-800">3,450 <span className="text-xs text-slate-400 font-normal">/ 5,000</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[70%]"></div>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                <div className="text-slate-400 text-xs font-semibold">Sleep Quality</div>
                <div className="text-2xl font-extrabold text-slate-800">7.5 hrs <span className="text-xs text-emerald-600 font-normal">Restful</span></div>
                <div className="text-xs text-slate-500">Deep sleep: 2h 15m</div>
              </div>
            </div>

          </div>

          {/* Right Col: Isolation Prevention & Buddy Quick Box */}
          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-lg space-y-4">
              <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold w-fit">
                <Coffee className="w-3.5 h-3.5" />
                <span>Isolation Prevention</span>
              </div>
              <h3 className="text-xl font-extrabold">Never Feel Alone</h3>
              <p className="text-amber-50 text-xs leading-relaxed">
                Join our live audio-video coffee circles or chat with your assigned buddy today. Connection heals and uplifts!
              </p>
              <button 
                onClick={() => setActiveSubTab('circles')}
                className="w-full bg-white text-orange-800 font-bold py-3 rounded-2xl text-sm shadow hover:bg-amber-50 transition"
              >
                Browse Coffee Circles ☕
              </button>
            </div>

            {/* Buddy Match Widget */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Your Community Buddies</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">Active</span>
              </div>
              <div className="space-y-3">
                {buddies.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{b.avatar}</div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{b.name}</h4>
                        <p className="text-xs text-slate-500">{b.status}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Starting a friendly call or chat with ${b.name}!`)}
                      className="p-2 bg-emerald-500 text-white rounded-xl shadow hover:bg-emerald-600 transition"
                      title="Call or Message Buddy"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'circles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Virtual Coffee Circles & Social Rooms</h2>
              <p className="text-slate-500 text-sm">Drop in anytime to chat, share stories, or practice gentle exercise with peers.</p>
            </div>
            <button 
              onClick={onOpenJoinCircle}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow transition"
            >
              + Host a Room
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {circles.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">{c.category}</span>
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.participants} joined</span>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">Hosted by <span className="font-semibold text-slate-700">{c.host}</span></p>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">{c.time}</span>
                  <button 
                    onClick={() => alert(`Joining "${c.title}"! Connecting audio and video...`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
                  >
                    Join Room 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'buddies' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Isolation Prevention & Buddy Match Network</h2>
              <p className="text-slate-500 text-sm">We pair seniors with thoughtful student volunteers and local peers based on hobbies, music preferences, and life stories.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                <div className="text-3xl">🌱</div>
                <h3 className="font-bold text-slate-900">Daily Check-in Calls</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Friendly daily morning calls to say hello, check medication, and brighten your day.</p>
              </div>
              <div className="p-6 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                <div className="text-3xl">🎻</div>
                <h3 className="font-bold text-slate-900">Shared Hobbies & Music</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Connect over gardening, chess, classic cinema, or listening to timeless jazz & classical records.</p>
              </div>
              <div className="p-6 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-3">
                <div className="text-3xl">👨‍👩‍👧‍👦</div>
                <h3 className="font-bold text-slate-900">Family Bridge</h3>
                <p className="text-xs text-slate-600 leading-relaxed">Easy voice memos and photo sharing with grandchildren away at university or work.</p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button 
                onClick={() => alert("Matching questionnaire opened! We'll connect you with a new buddy within 24 hours.")}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:opacity-95 transition"
              >
                Request New Buddy Match 🤝
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'family' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Family Voice & Photo Feed</h2>
              <p className="text-slate-500 text-sm">Hear warm voice greetings and view fresh photos sent by your loving family.</p>
            </div>
            <button 
              onClick={onOpenVoiceNote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow transition"
            >
              🎙️ Send Voice Note to Family
            </button>
          </div>

          <div className="space-y-4">
            {familyUpdates.map(up => (
              <div key={up.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      {up.sender.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{up.sender}</h4>
                      <p className="text-xs text-slate-400">{up.time}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full">
                    {up.type === 'voice' ? 'Voice Message' : 'Photo Update'}
                  </span>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed">{up.text}</p>

                {up.type === 'voice' && (
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => alert("Playing voice message from Emily...")}
                        className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow"
                      >
                        ▶
                      </button>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Voice Greeting ({up.duration})</div>
                        <div className="text-xs text-slate-500">Tap to play audio</div>
                      </div>
                    </div>
                    <div className="text-xs text-emerald-600 font-bold">HD Audio</div>
                  </div>
                )}

                {up.image && (
                  <div className="rounded-2xl overflow-hidden shadow-sm max-h-80">
                    <img src={up.image} alt="Family update" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

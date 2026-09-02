import React, { useState } from 'react'
import { Shield, Users, Brain, AlertCircle, CheckCircle2, TrendingUp, Calendar, Bell, Plus, FileText, Heart } from 'lucide-react'

export function CaregiverHub() {
  const [careNotes, setCareNotes] = useState([
    { id: 1, date: 'Today, 9:15 AM', author: 'Dr. Evelyn Vance', note: 'Grandma’s blood pressure is stable (122/78). Recommended continued morning walks.' },
    { id: 2, date: 'Yesterday', author: 'Parent / Caregiver', note: 'Alex completed 3 emotion recognition sessions with 92% score. Showing great progress!' }
  ])
  const [newNote, setNewNote] = useState('')

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setCareNotes([{ id: Date.now(), date: 'Just now', author: 'Caregiver / Family', note: newNote }, ...careNotes])
    setNewNote('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white p-8 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-yellow-300" />
            <span>Caregiver & Family Management Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Comprehensive Monitoring & Peace of Mind
          </h1>
          <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
            Monitor senior well-being, isolation prevention metrics, medication adherence, and autism therapy milestones in real time.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Senior Isolation Risk</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Low Risk</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">Connected</div>
          <p className="text-xs text-slate-500">Attended 2 coffee circles today</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Medication Adherence</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">95%</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">2 / 3 Taken</div>
          <p className="text-xs text-slate-500">Evening dose scheduled at 8:00 PM</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Autism Therapy Games</span>
            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">Active</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">4 Sessions</div>
          <p className="text-xs text-slate-500">Emotion recognition & focus tiles</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Emergency SOS Status</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Ready</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">Secure</div>
          <p className="text-xs text-slate-500">Linked to 3 family members</p>
        </div>

      </div>

      {/* Main Care Notes & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Care Notes & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Shared Care Notes & Log</h3>
                  <p className="text-xs text-slate-500">Add updates for family members and healthcare providers</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddNote} className="flex gap-3">
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a care note or update..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500"
              />
              <button 
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-2xl shadow transition"
              >
                Post Note
              </button>
            </form>

            <div className="space-y-4 pt-2">
              {careNotes.map(note => (
                <div key={note.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{note.author}</span>
                    <span className="text-xs text-slate-400">{note.date}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: AI Care Recommendations */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold w-fit">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>AI Care Insights</span>
            </div>
            <h3 className="text-xl font-extrabold">Proactive Recommendations</h3>
            <ul className="space-y-3 text-xs text-indigo-100 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Grandma participated in 2 morning coffee circles this week. Social isolation risk score decreased by 18%.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Alex successfully completed 4 consecutive days of emotion recognition games with stellar accuracy.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Suggested action: Send a voice note or photo update this weekend to maintain strong family connection.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  )
}

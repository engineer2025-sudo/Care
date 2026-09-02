import React, { useState } from 'react'
import { Navbar } from './components/Navbar'
import { SeniorCare } from './components/SeniorCare'
import { TherapeuticGames } from './components/TherapeuticGames'
import { CaregiverHub } from './components/CaregiverHub'
import { SOSModal, VoiceNoteModal, JoinCircleModal, AddMedicationModal } from './components/Modals'
import { Sparkles, Users, Brain, Shield, Heart, ArrowRight, CheckCircle2, Coffee, LifeBuoy } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [fontSize, setFontSize] = useState('normal') // 'normal', 'large', 'xl'
  const [highContrast, setHighContrast] = useState(false)

  // Modals
  const [sosOpen, setSosOpen] = useState(false)
  const [voiceNoteOpen, setVoiceNoteOpen] = useState(false)
  const [joinCircleOpen, setJoinCircleOpen] = useState(false)
  const [addMedicationOpen, setAddMedicationOpen] = useState(false)

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-800'
    } ${fontSize === 'large' ? 'text-lg' : fontSize === 'xl' ? 'text-xl' : 'text-base'}`}>
      
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fontSize={fontSize}
        setFontSize={setFontSize}
        highContrast={highContrast}
        setHighContrast={setHighContrast}
        onTriggerSOS={() => setSosOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
            
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Proactive Senior Care & Autism Wellness Platform</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                CareSphere: Connection, Joy & Therapeutic Growth
              </h1>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                Empowering seniors to prevent isolation and loneliness through daily check-ins, buddy matching, and live coffee circles — while helping children and adults on the autism spectrum thrive through engaging, sensory-calming therapeutic games.
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button 
                  onClick={() => setActiveTab('senior')}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
                >
                  <Users className="w-5 h-5" />
                  <span>Explore Senior Care & Isolation Prevention</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => setActiveTab('games')}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition transform hover:-translate-y-0.5"
                >
                  <Brain className="w-5 h-5" />
                  <span>Play Autism & Therapeutic Games</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl font-bold">
                  ☕
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Senior Isolation Prevention</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Combat loneliness with live virtual coffee circles, daily mood check-ins, volunteer buddy matching, and warm family voice updates.
                </p>
                <button 
                  onClick={() => setActiveTab('senior')}
                  className="text-emerald-600 font-bold text-sm flex items-center space-x-1 hover:underline pt-2"
                >
                  <span>Open Senior Care Hub</span>
                  <span>→</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl font-bold">
                  🧩
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Autism Therapy & Support Games</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Emotion recognition match, sensory calming soundscapes, predictable visual routines, and memory focus tiles designed for neurodiversity.
                </p>
                <button 
                  onClick={() => setActiveTab('games')}
                  className="text-indigo-600 font-bold text-sm flex items-center space-x-1 hover:underline pt-2"
                >
                  <span>Explore Games Suite</span>
                  <span>→</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl font-bold">
                  🛡️
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Caregiver & Family Hub</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Real-time health monitoring, medication reminders, AI care insights, and emergency SOS dispatch to ensure absolute peace of mind.
                </p>
                <button 
                  onClick={() => setActiveTab('caregiver')}
                  className="text-purple-600 font-bold text-sm flex items-center space-x-1 hover:underline pt-2"
                >
                  <span>Open Caregiver Hub</span>
                  <span>→</span>
                </button>
              </div>

            </div>

            {/* Testimonial / Impact Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center space-x-2 bg-white/20 px-3.5 py-1 rounded-full text-xs font-semibold">
                  <Heart className="w-4 h-4 text-rose-300" />
                  <span>Impact That Matters</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  Built with Empathy, Accessible for Everyone
                </h2>
                <p className="text-emerald-50 text-sm leading-relaxed">
                  Whether keeping grandparents connected with daily coffee chats and volunteer buddies, or supporting children and adults with calming cognitive & emotional games, CareSphere brings whole-family wellness together.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setActiveTab('senior')}
                  className="bg-white text-emerald-800 font-bold px-6 py-3.5 rounded-2xl shadow hover:bg-emerald-50 transition text-sm whitespace-nowrap"
                >
                  Get Started - Seniors
                </button>
                <button 
                  onClick={() => setActiveTab('games')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-2xl border border-emerald-500 transition text-sm whitespace-nowrap"
                >
                  Play Therapy Games
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'senior' && (
          <SeniorCare 
            onOpenJoinCircle={() => setJoinCircleOpen(true)}
            onOpenVoiceNote={() => setVoiceNoteOpen(true)}
            onOpenAddMedication={() => setAddMedicationOpen(true)}
          />
        )}

        {activeTab === 'games' && <TherapeuticGames />}

        {activeTab === 'caregiver' && <CaregiverHub />}
      </main>

      {/* Modals */}
      <SOSModal isOpen={sosOpen} onClose={() => setSosOpen(false)} />
      <VoiceNoteModal isOpen={voiceNoteOpen} onClose={() => setVoiceNoteOpen(false)} />
      <JoinCircleModal isOpen={joinCircleOpen} onClose={() => setJoinCircleOpen(false)} />
      <AddMedicationModal isOpen={addMedicationOpen} onClose={() => setAddMedicationOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center space-x-2 font-bold text-slate-700">
          <span>💚 CareSphere Proactive Senior Care & Neurodiversity Wellness</span>
        </div>
        <p>Designed for proactive senior care, isolation prevention, and therapeutic autism support games.</p>
      </footer>

    </div>
  )
}

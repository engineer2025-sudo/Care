import React from 'react'
import { Heart, Shield, Users, Sparkles, Brain, Bell, Settings, LifeBuoy, Volume2, ZoomIn, ZoomOut } from 'lucide-react'

export function Navbar({ activeTab, setActiveTab, fontSize, setFontSize, highContrast, setHighContrast, unreadCount, onTriggerSOS }) {
  return (
    <header className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
      highContrast ? 'bg-black text-white border-yellow-400' : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-2xl">
              💚
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  CareSphere
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Pro & Care
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Senior Isolation Prevention & Autism Support Games</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('senior')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'senior'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" />
              <span>Senior Care & Isolation</span>
            </button>

            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'games'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Brain className="w-4 h-4 text-sky-500" />
              <span>Autism Games & Therapy</span>
            </button>

            <button
              onClick={() => setActiveTab('caregiver')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'caregiver'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-500" />
              <span>Caregiver Hub</span>
            </button>
          </nav>

          {/* Right Actions: Accessibility & SOS */}
          <div className="flex items-center space-x-3">
            {/* Font size toggle */}
            <button
              onClick={() => setFontSize(prev => prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal')}
              title="Adjust Text Size"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 text-xs font-medium"
            >
              <ZoomIn className="w-4 h-4" />
              <span className="hidden lg:inline uppercase">{fontSize}</span>
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              title="Toggle High Contrast Mode"
              className={`p-2.5 rounded-xl transition text-xs font-medium ${
                highContrast ? 'bg-yellow-400 text-black font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Contrast
            </button>

            {/* SOS Emergency Button */}
            <button
              onClick={onTriggerSOS}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-red-500/20 transition animate-pulse"
            >
              <LifeBuoy className="w-4 h-4" />
              <span>SOS Help</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('senior')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'senior' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Senior & Isolation
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'games' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Autism Games
          </button>
          <button
            onClick={() => setActiveTab('caregiver')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activeTab === 'caregiver' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Caregiver Hub
          </button>
        </div>

      </div>
    </header>
  )
}

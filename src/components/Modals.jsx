import React from 'react'
import { LifeBuoy, Mic, Coffee, Pill, X, ShieldAlert, CheckCircle2 } from 'lucide-react'

export function SOSModal({ isOpen, onClose }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-red-100 text-center relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
          🚨
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold text-slate-900">Emergency SOS Dispatched</h3>
          <p className="text-slate-500 text-sm">
            Notifying family caregivers, emergency contacts, and care response coordinators immediately with your location.
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2 text-left">
          <div className="flex items-center space-x-2 text-red-800 font-bold text-xs uppercase">
            <ShieldAlert className="w-4 h-4" />
            <span>Active Dispatch Status</span>
          </div>
          <p className="text-xs text-red-700">Family members called: Emily (Daughter), David (Son). Response team alerted.</p>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-2xl shadow hover:bg-slate-800 transition"
        >
          Dismiss / I am Safe
        </button>
      </div>
    </div>
  )
}

export function VoiceNoteModal({ isOpen, onClose }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
          🎙️
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Record Family Voice Note</h3>
          <p className="text-slate-500 text-xs">Send a warm voice greeting to seniors or children in your family feed.</p>
        </div>

        <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl shadow-lg animate-pulse cursor-pointer">
            <Mic className="w-8 h-8" />
          </div>
          <p className="text-xs text-slate-500">Tap to record (up to 60 seconds)</p>
        </div>

        <button 
          onClick={() => {
            alert("Voice note recorded and sent successfully to family feed!")
            onClose()
          }}
          className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow hover:bg-emerald-700 transition"
        >
          Send Voice Note 🚀
        </button>
      </div>
    </div>
  )
}

export function JoinCircleModal({ isOpen, onClose }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
          ☕
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Host a Coffee Circle</h3>
          <p className="text-slate-500 text-xs">Create a live audio-video room for seniors to connect, chat, and prevent isolation.</p>
        </div>

        <div className="space-y-3 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-700">Room Title</label>
            <input type="text" placeholder="e.g. Afternoon Tea & Stories" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Category</label>
            <select className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500">
              <option>Social & Chat</option>
              <option>Gentle Exercise & Yoga</option>
              <option>Trivia & Entertainment</option>
              <option>Literature & Book Club</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => {
            alert("Coffee circle hosted successfully! Peers have been notified.")
            onClose()
          }}
          className="w-full bg-amber-600 text-white font-bold py-3.5 rounded-2xl shadow hover:bg-amber-700 transition"
        >
          Launch Room 🚀
        </button>
      </div>
    </div>
  )
}

export function AddMedicationModal({ isOpen, onClose }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
          💊
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Add Medication Reminder</h3>
          <p className="text-slate-500 text-xs">Set friendly scheduled reminders for health medications and vitamins.</p>
        </div>

        <div className="space-y-3 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-700">Medication Name</label>
            <input type="text" placeholder="e.g. Aspirin / Vitamin C" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Dosage</label>
              <input type="text" placeholder="e.g. 50mg" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Time</label>
              <input type="time" defaultValue="09:00" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            alert("Medication reminder added successfully!")
            onClose()
          }}
          className="w-full bg-rose-600 text-white font-bold py-3.5 rounded-2xl shadow hover:bg-rose-700 transition"
        >
          Save Reminder 🔔
        </button>
      </div>
    </div>
  )
}

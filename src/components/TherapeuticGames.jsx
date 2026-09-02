import React, { useState, useEffect } from 'react'
import { Brain, Smile, Volume2, Sparkles, CheckCircle2, RefreshCw, Layers, Award, Shield, Heart } from 'lucide-react'
import confetti from 'canvas-confetti'

export function TherapeuticGames() {
  const [activeGame, setActiveGame] = useState('menu') // 'menu', 'emotion', 'sensory', 'routine', 'memory'

  // --- Game 1: Emotion Match State ---
  const emotionRounds = [
    { target: 'Happy 😊', options: ['😊', '😢', '😡'], correct: '😊', hint: 'Smiling eyes and upward mouth curve' },
    { target: 'Calm 😌', options: ['😱', '😌', '😤'], correct: '😌', hint: 'Relaxed shoulders and peaceful expression' },
    { target: 'Surprised 😲', options: ['😲', '😴', '😒'], correct: '😲', hint: 'Wide eyes and open mouth' },
    { target: 'Thoughtful 🤔', options: ['😜', '🤔', '😭'], correct: '🤔', hint: 'Hand on chin reflecting on a question' }
  ]
  const [currentRound, setCurrentRound] = useState(0)
  const [emotionScore, setEmotionScore] = useState(0)
  const [emotionFeedback, setEmotionFeedback] = useState(null)

  // --- Game 2: Sensory Soundscape State ---
  const [activeSound, setActiveSound] = useState(null)
  const sounds = [
    { name: 'Gentle Rain', icon: '🌧️', desc: 'Soft soothing raindrops for focus & calm', bg: 'from-blue-400 to-indigo-500' },
    { name: 'Ocean Waves', icon: '🌊', desc: 'Steady rhythmic waves for deep relaxation', bg: 'from-cyan-400 to-blue-500' },
    { name: 'Forest Chimes', icon: '🌲', desc: 'Wind through pine trees and soft chimes', bg: 'from-emerald-400 to-teal-500' },
    { name: 'Warm Hearth', icon: '🔥', desc: 'Crackling fire for cozy comfort', bg: 'from-amber-400 to-orange-500' }
  ]

  // --- Game 3: Routine Builder State ---
  const [routineSteps, setRoutineSteps] = useState([
    { id: 1, title: '1. Wake up & stretch gently', done: true, icon: '🌅' },
    { id: 2, title: '2. Drink a glass of fresh water', done: true, icon: '💧' },
    { id: 3, title: '3. Eat a nourishing breakfast', done: false, icon: '🥣' },
    { id: 4, title: '4. Choose a calming therapeutic game', done: false, icon: '🧩' },
    { id: 5, title: '5. Evening relaxation & sleep', done: false, icon: '🌙' }
  ])

  // --- Game 4: Memory Match State ---
  const cardIcons = ['🌟', '🍎', '🐱', '🚀', '🎨', '🧸']
  const [memoryCards, setMemoryCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [memoryMoves, setMemoryMoves] = useState(0)

  // Initialize memory game
  const initMemoryGame = () => {
    const deck = [...cardIcons, ...cardIcons]
      .sort(() => Math.random() - 0.5)
      .map((icon, idx) => ({ id: idx, icon }))
    setMemoryCards(deck)
    setFlipped([])
    setMatched([])
    setMemoryMoves(0)
  }

  useEffect(() => {
    initMemoryGame()
  }, [])

  const handleCardClick = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return
    const newFlipped = [...flipped, idx]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMemoryMoves(m => m + 1)
      const [firstIdx, secondIdx] = newFlipped
      if (memoryCards[firstIdx].icon === memoryCards[secondIdx].icon) {
        setMatched(prev => {
          const nextMatched = [...prev, firstIdx, secondIdx]
          if (nextMatched.length === memoryCards.length) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
          }
          return nextMatched
        })
        setFlipped([])
      } else {
        setTimeout(() => setFlipped([]), 900)
      }
    }
  }

  const handleEmotionGuess = (emoji) => {
    const round = emotionRounds[currentRound]
    if (emoji === round.correct) {
      setEmotionFeedback('Correct! Wonderful job! 🎉')
      setEmotionScore(s => s + 1)
      confetti({ particleCount: 50, spread: 60 })
      setTimeout(() => {
        setEmotionFeedback(null)
        if (currentRound < emotionRounds.length - 1) {
          setCurrentRound(r => r + 1)
        } else {
          setCurrentRound(0)
        }
      }, 1200)
    } else {
      setEmotionFeedback('Not quite. Try another one! You can do it! 💪')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white p-8 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold">
            <Brain className="w-3.5 h-3.5 text-yellow-300" />
            <span>Autism Support & Therapeutic Games Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Cognitive Growth, Sensory Calm & Social Skills
          </h1>
          <p className="text-sky-50 text-sm sm:text-base leading-relaxed">
            Designed for children and adults on the autism spectrum to foster emotional recognition, predictable visual routines, sensory grounding, and executive functioning through playful, stress-free gameplay.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => setActiveGame('menu')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeGame === 'menu' ? 'bg-white text-indigo-900 shadow' : 'bg-indigo-700/60 text-white hover:bg-indigo-700'}`}
            >
              🎮 Games Menu
            </button>
            <button 
              onClick={() => setActiveGame('emotion')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeGame === 'emotion' ? 'bg-white text-indigo-900 shadow' : 'bg-indigo-700/60 text-white hover:bg-indigo-700'}`}
            >
              😊 Emotion Match
            </button>
            <button 
              onClick={() => setActiveGame('sensory')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeGame === 'sensory' ? 'bg-white text-indigo-900 shadow' : 'bg-indigo-700/60 text-white hover:bg-indigo-700'}`}
            >
              🌊 Sensory Soundscapes
            </button>
            <button 
              onClick={() => setActiveGame('routine')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeGame === 'routine' ? 'bg-white text-indigo-900 shadow' : 'bg-indigo-700/60 text-white hover:bg-indigo-700'}`}
            >
              📋 Predictable Routines
            </button>
            <button 
              onClick={() => setActiveGame('memory')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeGame === 'memory' ? 'bg-white text-indigo-900 shadow' : 'bg-indigo-700/60 text-white hover:bg-indigo-700'}`}
            >
              🧠 Memory Match
            </button>
          </div>
        </div>
      </div>

      {/* MENU VIEW */}
      {activeGame === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div 
            onClick={() => setActiveGame('emotion')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                😊
              </div>
              <h3 className="text-xl font-bold text-slate-900">Emotion Match</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Practice recognizing facial expressions and emotional cues in a calm, guided environment.
              </p>
            </div>
            <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1">
              <span>Play Game</span>
              <span>→</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveGame('sensory')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🌊
              </div>
              <h3 className="text-xl font-bold text-slate-900">Sensory Soundscapes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Soothing ambient audio and calming visual colors for sensory regulation and relaxation.
              </p>
            </div>
            <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1">
              <span>Explore Sound</span>
              <span>→</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveGame('routine')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                📋
              </div>
              <h3 className="text-xl font-bold text-slate-900">Predictable Routines</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Step-by-step visual schedule builder to reduce anxiety and build confident daily habits.
              </p>
            </div>
            <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1">
              <span>Build Routine</span>
              <span>→</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveGame('memory')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition cursor-pointer space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                🧠
              </div>
              <h3 className="text-xl font-bold text-slate-900">Memory Focus Tiles</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Calming memory card matching game with zero time pressure and delightful rewards.
              </p>
            </div>
            <div className="text-xs font-bold text-indigo-600 flex items-center space-x-1">
              <span>Play Memory</span>
              <span>→</span>
            </div>
          </div>

        </div>
      )}

      {/* GAME 1: EMOTION MATCH */}
      {activeGame === 'emotion' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">😊</span>
              <h2 className="text-xl font-bold text-slate-900">Emotion Recognition Match</h2>
            </div>
            <div className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-full">
              Score: {emotionScore}
            </div>
          </div>

          <div className="text-center space-y-4 py-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Find the face that represents:</p>
            <div className="text-4xl font-extrabold text-indigo-900 bg-indigo-50/60 py-6 rounded-2xl border border-indigo-100">
              {emotionRounds[currentRound].target}
            </div>
            <p className="text-xs text-slate-500 italic">Hint: {emotionRounds[currentRound].hint}</p>

            {emotionFeedback && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-sm animate-bounce">
                {emotionFeedback}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {emotionRounds[currentRound].options.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleEmotionGuess(emoji)}
                className="h-24 rounded-2xl bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-400 text-4xl flex items-center justify-center transition shadow-sm"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button 
              onClick={() => setActiveGame('menu')}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              ← Back to Games Menu
            </button>
            <button 
              onClick={() => setCurrentRound((currentRound + 1) % emotionRounds.length)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Skip to Next Round →
            </button>
          </div>
        </div>
      )}

      {/* GAME 2: SENSORY SOUNDSCAPES */}
      {activeGame === 'sensory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Sensory & Calming Soundscapes</h2>
              <p className="text-slate-500 text-sm">Select an ambient environment to relax, ground your senses, and regain calm.</p>
            </div>
            <button 
              onClick={() => setActiveGame('menu')}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl"
            >
              ← Back to Menu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sounds.map(snd => (
              <div key={snd.name} className={`rounded-3xl p-8 bg-gradient-to-tr ${snd.bg} text-white shadow-lg space-y-6 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <span className="text-5xl">{snd.icon}</span>
                  <span className="text-xs bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full font-semibold">
                    {activeSound === snd.name ? 'Playing 🔊' : 'Ready'}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold">{snd.name}</h3>
                  <p className="text-white/90 text-sm">{snd.desc}</p>
                </div>
                <button 
                  onClick={() => {
                    setActiveSound(activeSound === snd.name ? null : snd.name)
                    confetti({ particleCount: 30, spread: 50 })
                  }}
                  className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-2xl shadow hover:bg-slate-100 transition"
                >
                  {activeSound === snd.name ? 'Pause Soundscape ⏸️' : 'Start Soundscape 🎧'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GAME 3: PREDICTABLE ROUTINES */}
      {activeGame === 'routine' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-bold text-slate-900">Predictable Visual Daily Routine</h2>
            </div>
            <button 
              onClick={() => setActiveGame('menu')}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              ← Menu
            </button>
          </div>

          <p className="text-slate-500 text-sm">
            Predictable routines reduce anxiety and give a clear sense of structure. Check off steps as you complete them!
          </p>

          <div className="space-y-3">
            {routineSteps.map(step => (
              <div 
                key={step.id} 
                onClick={() => {
                  setRoutineSteps(routineSteps.map(s => s.id === step.id ? { ...s, done: !s.done } : s))
                  if (!step.done) confetti({ particleCount: 20 })
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                  step.done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{step.icon}</span>
                  <span className={`font-semibold text-sm ${step.done ? 'line-through text-emerald-700' : ''}`}>
                    {step.title}
                  </span>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'}`}>
                  {step.done && '✓'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GAME 4: MEMORY MATCH */}
      {activeGame === 'memory' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Calming Memory Focus Tiles</h2>
              <p className="text-xs text-slate-500">Moves: {memoryMoves} • Matched: {matched.length / 2} / {cardIcons.length}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={initMemoryGame}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                title="Restart"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActiveGame('menu')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Menu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 py-4">
            {memoryCards.map((card, idx) => {
              const isFlipped = flipped.includes(idx) || matched.includes(idx)
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  className={`h-24 rounded-2xl text-3xl flex items-center justify-center transition shadow-sm ${
                    isFlipped 
                      ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-900' 
                      : 'bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 text-transparent'
                  }`}
                >
                  {isFlipped ? card.icon : '❓'}
                </button>
              )
            })}
          </div>

          {matched.length === memoryCards.length && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center font-bold space-y-2">
              <p>🎉 Amazing job! You matched all memory tiles!</p>
              <button 
                onClick={initMemoryGame}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs shadow"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

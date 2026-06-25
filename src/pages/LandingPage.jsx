import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  const DOWNLOAD_URL = 'https://drive.google.com/uc?export=download&id=1g6pJB6L7tjknDftVk_Nfwfte810V5GKY'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-white font-sans overflow-x-hidden selection:bg-primary/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <header className={`w-full h-20 px-6 md:px-12 flex items-center justify-between fixed top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 logo-mask bg-white" aria-label="Dreamsdesk Logo" />
          <span className="text-2xl font-black tracking-tighter text-white">Dreamsdesk</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/login')}
            className="hidden md:block text-white/70 hover:text-white font-semibold transition-colors"
          >
            Web Login
          </button>
          <a 
            href={DOWNLOAD_URL}
            className="px-6 py-2.5 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Download Now
          </a>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center px-6 pt-32 md:pt-48 pb-24 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 w-full">
          <div className="flex-1 flex flex-col items-start text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 font-medium text-sm mb-8 backdrop-blur-sm shadow-xl">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Dreamsdesk Setup 0.0.0 is live
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6">
              The ultimate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-primary to-blue-400 animate-gradient-x">
                workspace
              </span> for teams.
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 mb-10 leading-relaxed font-light">
              Experience unparalleled speed and focus. Native performance, real-time sync, and everything your team needs to ship faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <a 
                href={DOWNLOAD_URL}
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-container hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_40px_rgba(var(--color-primary),0.4)] flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="relative z-10">Download for Windows</span>
              </a>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all flex items-center justify-center gap-2"
              >
                Open in Browser
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="mt-4 text-sm text-white/40 font-medium">Windows 10/11 • 64-bit</p>
          </div>

          <div className="flex-1 w-full max-w-2xl relative">
            {/* Premium UI Mockup Presentation */}
            <div className="relative rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 p-2 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transform hover:scale-[1.02] transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-[2rem] blur-2xl -z-10" />
              <div className="rounded-[1.5rem] bg-[#121214] overflow-hidden border border-white/5 flex flex-col shadow-2xl h-[400px]">
                {/* Mockup Header */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-white/[0.02]">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                {/* Mockup Content */}
                <div className="flex-1 p-6 flex flex-col gap-4 relative overflow-hidden">
                  <div className="w-3/4 h-8 rounded-lg bg-white/5 animate-pulse" />
                  <div className="w-full h-24 rounded-xl bg-white/5 animate-pulse delay-75" />
                  <div className="flex gap-4">
                    <div className="flex-1 h-32 rounded-xl bg-primary/20 border border-primary/20 animate-pulse delay-150" />
                    <div className="flex-1 h-32 rounded-xl bg-purple-500/20 border border-purple-500/20 animate-pulse delay-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full">
          {[
            {
              title: 'Lightning Fast',
              desc: 'Native desktop architecture ensures zero latency and instant UI updates.',
              icon: 'M13 10V3L4 14h7v7l9-11h-7z',
              color: 'text-yellow-400',
              bg: 'bg-yellow-400/10'
            },
            {
              title: 'Real-Time Sync',
              desc: 'Powered by MQTT, your tasks and chats sync across devices instantaneously.',
              icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
              color: 'text-blue-400',
              bg: 'bg-blue-400/10'
            },
            {
              title: 'Offline Ready',
              desc: 'Keep working even when your connection drops. Data syncs when you return.',
              icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
              color: 'text-green-400',
              bg: 'bg-green-400/10'
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors group">
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} /></svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 py-10 text-center border-t border-white/10 bg-black/50 backdrop-blur-lg">
        <p className="text-white/40 font-medium">&copy; {new Date().getFullYear()} Dreamsdesign. Built for high-performance teams.</p>
      </footer>
    </div>
  )
}

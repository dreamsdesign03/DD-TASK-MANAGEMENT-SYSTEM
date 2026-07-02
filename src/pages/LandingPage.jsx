import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const DOWNLOAD_URL = 'https://github.com/dreamsdesign03/DD-TASK-MANAGEMENT-SYSTEM/releases/download/v0.0.1/Dreamsdesk.Setup.0.0.1.exe'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#F8FAFC] text-slate-900 selection:bg-primary/20 selection:text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />
      
      {/* Soft Top Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Navbar */}
      <header className={`w-full h-20 px-6 md:px-12 flex items-center justify-between fixed top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm' : 'bg-transparent border-b border-transparent'}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 logo-mask bg-primary" aria-label="Dreamsdesk Logo" />
          <span className="text-xl font-bold tracking-tight text-slate-900">Dreamsdesk</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/login')}
            className="hidden md:block text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            Web Login
          </button>
          <a 
            href={DOWNLOAD_URL}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-semibold text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Download Now
          </a>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center px-6 pt-32 md:pt-48 pb-24 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 w-full">
          <div className="flex-1 flex flex-col items-start text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold text-xs mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Dreamsdesk Setup 0.0.1 is live
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6 text-slate-900">
              The ultimate <br />
              <span className="text-primary">
                workspace
              </span> for teams.
            </h1>
            
            <p className="text-base md:text-lg text-slate-600 mb-10 leading-relaxed font-medium max-w-lg">
              Experience unparalleled speed and focus. Native performance, real-time sync, and everything your team needs to ship faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <a 
                href={DOWNLOAD_URL}
                className="w-full sm:w-auto px-8 py-4 btn-gradient rounded-xl font-bold text-base transition-all shadow-[0_8px_20px_-6px_rgba(var(--color-primary),0.5)] flex items-center justify-center gap-3 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download for Windows
              </a>
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 rounded-xl font-bold text-base border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Open in Browser
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400 font-bold tracking-widest uppercase">Windows 10/11 • 64-bit</p>
          </div>

          <div className="flex-1 w-full max-w-2xl relative">
            {/* Dreamsdesk Dashboard Realistic Mockup */}
            <div className="relative rounded-[1.5rem] bg-white p-2 border border-slate-200 shadow-2xl shadow-slate-200/50 transform rotate-1 hover:rotate-0 hover:scale-[1.01] transition-all duration-500">
              <div className="rounded-xl bg-slate-50 overflow-hidden border border-slate-200 flex flex-col h-[420px] relative">
                
                {/* Browser/Window Header */}
                <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2 bg-white shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="ml-4 h-5 w-48 bg-slate-100 rounded-md border border-slate-200/50" />
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Sidebar (Matches Image) */}
                  <div className="w-48 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0">
                    {/* Logo Area */}
                    <div className="flex items-center gap-2 mb-8">
                      <div className="w-6 h-6 rounded-md bg-primary" />
                      <div className="h-4 w-20 bg-slate-800 rounded" />
                    </div>
                    {/* Nav Items */}
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="h-8 w-full bg-slate-100 rounded-md border-l-4 border-primary flex items-center px-3">
                        <div className="h-3 w-16 bg-primary/80 rounded" />
                      </div>
                      <div className="h-8 w-full rounded-md flex items-center px-3 gap-2">
                        <div className="h-3 w-3 rounded bg-slate-300" />
                        <div className="h-3 w-20 bg-slate-300 rounded" />
                      </div>
                      <div className="h-8 w-full rounded-md flex items-center px-3 gap-2">
                        <div className="h-3 w-3 rounded bg-slate-300" />
                        <div className="h-3 w-12 bg-slate-300 rounded" />
                      </div>
                      <div className="h-8 w-full rounded-md flex items-center px-3 gap-2">
                        <div className="h-3 w-3 rounded bg-slate-300" />
                        <div className="h-3 w-14 bg-slate-300 rounded" />
                      </div>
                    </div>
                    {/* New Task Button */}
                    <div className="mt-auto h-10 w-full bg-primary rounded-lg flex items-center justify-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-white/50" />
                      <div className="h-3 w-16 bg-white rounded" />
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col bg-slate-50">
                    {/* Topbar */}
                    <div className="h-14 border-b border-slate-200 bg-white flex items-center px-6 justify-between shrink-0">
                      <div className="h-8 w-48 bg-slate-100 rounded-md border border-slate-200" />
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-200" />
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-primary/40" />
                        </div>
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-6 flex flex-col gap-6 overflow-hidden">
                      {/* Title & Filters */}
                      <div>
                        <div className="h-6 w-32 bg-primary font-bold rounded mb-4" />
                        <div className="flex gap-2">
                          <div className="h-7 w-16 bg-primary rounded-full" />
                          <div className="h-7 w-20 border border-primary/40 rounded-full" />
                          <div className="h-7 w-24 border border-primary/40 rounded-full" />
                          <div className="h-7 w-20 border border-primary/40 rounded-full" />
                        </div>
                      </div>

                      {/* Task Table */}
                      <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                        {/* Table Header */}
                        <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-4">
                          <div className="h-3 w-16 bg-slate-300 rounded" />
                          <div className="h-3 w-32 bg-slate-300 rounded" />
                          <div className="h-3 w-24 bg-slate-300 rounded ml-auto" />
                        </div>
                        {/* Table Row 1 */}
                        <div className="h-14 border-b border-slate-100 flex items-center px-4 gap-4 bg-slate-50/50">
                          <div className="h-5 w-16 bg-slate-200 rounded-md" />
                          <div className="h-4 w-48 bg-primary/80 rounded" />
                          <div className="flex gap-1 ml-auto">
                            <div className="h-6 w-6 rounded-full bg-purple-600" />
                            <div className="h-6 w-6 rounded-full bg-purple-800 -ml-2" />
                          </div>
                          <div className="h-6 w-20 bg-blue-500 rounded-full" />
                        </div>
                        {/* Table Row 2 */}
                        <div className="h-14 border-b border-slate-100 flex items-center px-4 gap-4">
                          <div className="h-5 w-16 bg-slate-200 rounded-md" />
                          <div className="h-4 w-40 bg-slate-400 rounded" />
                          <div className="flex gap-1 ml-auto">
                            <div className="h-6 w-6 rounded-full bg-purple-400" />
                          </div>
                          <div className="h-6 w-20 bg-red-400 rounded-full" />
                        </div>
                        {/* Table Row 3 */}
                        <div className="h-14 flex items-center px-4 gap-4 bg-slate-50/50">
                          <div className="h-5 w-16 bg-slate-200 rounded-md" />
                          <div className="h-4 w-32 bg-slate-400 rounded" />
                          <div className="flex gap-1 ml-auto">
                            <div className="h-6 w-6 rounded-full bg-purple-500" />
                          </div>
                          <div className="h-6 w-20 bg-red-400 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full">
          {[
            {
              title: 'Lightning Fast',
              desc: 'Native desktop architecture ensures zero latency and instant UI updates.',
              icon: 'M13 10V3L4 14h7v7l9-11h-7z'
            },
            {
              title: 'Real-Time Sync',
              desc: 'Powered by MQTT, your tasks and chats sync across devices instantaneously.',
              icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
            },
            {
              title: 'Offline Ready',
              desc: 'Keep working even when your connection drops. Data syncs when you return.',
              icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-slate-900">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed font-normal">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 py-10 text-center border-t border-slate-200 bg-white">
        <p className="text-slate-500 text-sm font-medium">&copy; {new Date().getFullYear()} Dreamsdesign. Built for high-performance teams.</p>
      </footer>
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  // TODO: The user must replace this with the actual URL where they host the Setup.exe file
  // (e.g., a Google Drive direct link, Dropbox, or AWS S3 link)
  const DOWNLOAD_URL = '#'

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col font-sans">
      {/* Navbar */}
      <header className="w-full h-20 px-8 flex items-center justify-between border-b border-outline/20 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 logo-mask" aria-label="Dreamsdesk Logo" />
          <span className="text-xl font-bold text-on-surface tracking-tight">Dreamsdesk</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-secondary hover:text-primary font-medium transition-colors"
          >
            Web Login
          </button>
          <a 
            href={DOWNLOAD_URL}
            className="px-5 py-2.5 bg-primary text-white rounded-full font-label-lg font-bold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm"
          >
            Download
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Dreamsdesk Desktop v0.0.1 is here!
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-on-surface tracking-tight max-w-4xl leading-tight mb-6">
          The Ultimate Workspace for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Your Team</span>
        </h1>
        
        <p className="text-xl text-secondary max-w-2xl mb-12 leading-relaxed">
          Manage tasks, collaborate in real-time, and streamline your workflow with the Dreamsdesk desktop application. Built for speed and focus.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md mx-auto">
          <a 
            href={DOWNLOAD_URL}
            onClick={(e) => {
              if (DOWNLOAD_URL === '#') {
                e.preventDefault()
                alert('Please upload "Dreamsdesk Setup 0.0.1.exe" to Google Drive and paste the link here!')
              }
            }}
            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for Windows
          </a>
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-surface-container-low text-on-surface rounded-xl font-bold text-lg border border-outline/30 hover:bg-surface-container-high transition-all flex items-center justify-center"
          >
            Open Web App
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full text-left">
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Task Management</h3>
            <p className="text-secondary">Organize projects, assign team members, and track progress all in one place with a beautiful interface.</p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Real-Time Chat</h3>
            <p className="text-secondary">Communicate instantly with your team using our integrated MQTT-powered chat system.</p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Native Performance</h3>
            <p className="text-secondary">Enjoy a seamless, fast, and highly responsive experience with our dedicated Windows application.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-secondary border-t border-outline/10">
        <p>&copy; {new Date().getFullYear()} Dreamsdesign. All rights reserved.</p>
      </footer>
    </div>
  )
}

import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'



const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ProfilePage() {
  const { profile, setProfile } = useApp()

  return (
    <div className="bg-background text-on-background flex h-screen overflow-hidden">
      {/* SideNavBar */}
      <Sidebar />

      {/* Main Container */}
      <div className="ml-[240px] flex flex-col flex-1 h-screen overflow-hidden">
        {/* TopNavBar */}
        <TopNav />

        {/* Main Content */}
        <main className="flex-1 bg-surface-container-low overflow-y-auto custom-scrollbar pt-0 pb-12">
          <div className="max-w-[1200px] mx-auto px-8 py-10">
            <div className="max-w-4xl mx-auto">
              {/* Profile Form & Info Card */}
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-sm flex flex-col h-full min-h-[600px]">
                <div className="p-8 flex-grow">
                  <div className="space-y-6">

                    <div className="col-span-full mt-8 bg-surface rounded-lg p-8 border border-outline-variant/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Left side: Photo, Name, Designation, Mail */}
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-primary-container text-white text-[28px] font-semibold flex-shrink-0">
                            <span>{getInitials(profile.name)}</span>
                          </div>
                          <div className="flex flex-col">
                            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-bold text-[22px]">
                              {profile.name}
                            </h2>
                            <p className="text-secondary font-label-md mb-1">{profile.role}</p>
                            <p className="text-[#6B6B6B] text-body-sm">{profile.email}</p>
                          </div>
                        </div>

                        {/* Right side: Joined, Department */}
                        <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-outline-variant/40 pt-6 md:pt-0 md:pl-8">
                          <div className="flex justify-between md:flex-col md:gap-1 text-body-sm">
                            <span className="text-secondary uppercase tracking-wider text-[11px] font-semibold">Joined Date</span>
                            <span className="font-semibold text-lg text-on-surface">
                              {(() => {
                                if (!profile.joined) return 'N/A'
                                try {
                                  const d = new Date(profile.joined)
                                  if (isNaN(d.getTime())) return profile.joined
                                  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                } catch {
                                  return profile.joined
                                }
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between md:flex-col md:gap-1 text-body-sm">
                            <span className="text-secondary uppercase tracking-wider text-[11px] font-semibold">Department</span>
                            <span className="font-semibold text-lg text-on-surface tracking-tight">{profile.department}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative floating-label-group">
                        <input
                          className="w-full p-3 bg-surface border border-outline rounded-md text-secondary cursor-not-allowed text-body-md peer"
                          id="full_name"
                          placeholder=" "
                          readOnly
                          type="text"
                          value={profile.name}
                        />
                        <label
                          className="absolute left-3 top-3.5 z-10 origin-[0] -translate-y-6 scale-75 transform bg-surface-container-lowest px-1 text-label-sm text-outline"
                          htmlFor="full_name"
                        >
                          Full Name
                        </label>
                      </div>
                      <div className="relative floating-label-group">
                        <input
                          className="w-full p-3 bg-surface border border-outline rounded-md text-secondary cursor-not-allowed text-body-md peer"
                          id="email"
                          placeholder=" "
                          readOnly
                          type="email"
                          value={profile.email}
                        />
                        <label
                          className="absolute left-3 top-3.5 z-10 origin-[0] -translate-y-6 scale-75 transform bg-surface-container-lowest px-1 text-label-sm text-outline"
                          htmlFor="email"
                        >
                          Email Address
                        </label>
                      </div>
                      <div className="relative floating-label-group">
                        <input
                          className="w-full p-3 bg-surface border border-outline rounded-md text-secondary cursor-not-allowed text-body-md peer"
                          id="phone"
                          placeholder=" "
                          readOnly
                          type="tel"
                          value={profile.phone}
                        />
                        <label
                          className="absolute left-3 top-3.5 z-10 origin-[0] -translate-y-6 scale-75 transform bg-surface-container-lowest px-1 text-label-sm text-outline"
                          htmlFor="phone"
                        >
                          Phone Number
                        </label>
                      </div>
                      <div className="relative floating-label-group">
                        <input
                          className="w-full p-3 bg-surface border border-outline rounded-md text-secondary cursor-not-allowed text-body-md peer"
                          id="role"
                          placeholder=" "
                          readOnly
                          type="text"
                          value={profile.role}
                        />
                        <label
                          className="absolute left-3 top-3.5 z-10 origin-[0] -translate-y-6 scale-75 transform bg-surface-container-lowest px-1 text-label-sm text-outline"
                          htmlFor="role"
                        >
                          Role
                        </label>
                      </div>
                      <div className="relative floating-label-group col-span-full">
                        <input
                          className="w-full p-3 bg-surface border border-outline rounded-md text-secondary cursor-not-allowed text-body-md peer"
                          id="department"
                          placeholder=" "
                          readOnly
                          type="text"
                          value={profile.department}
                        />
                        <label
                          className="absolute left-3 top-3.5 z-10 origin-[0] -translate-y-6 scale-75 transform bg-surface-container-lowest px-1 text-label-sm text-outline"
                          htmlFor="department"
                        >
                          Department
                        </label>
                      </div>

                      {/* Moved Profile Info Section */}


                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center px-8">
          <p className="font-label-sm text-label-sm text-secondary opacity-90">
            Dreamsdesk
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
              Support
            </a>
            <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}


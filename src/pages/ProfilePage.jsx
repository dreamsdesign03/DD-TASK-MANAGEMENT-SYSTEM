import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'


import { renderAvatar } from '../utils/avatar'

export default function ProfilePage() {
  const { profile, setProfile } = useApp()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background, #F0EDF8)', display: 'flex' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col h-[100vh] overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Profile" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-6">
          <div className="max-w-[1450px] mx-auto w-full bg-white dark:bg-[#1e1b2e] rounded-[20px] shadow-[0_8px_24px_rgba(91,33,182,0.08)] p-6 md:p-8 flex flex-col min-h-[600px]">
            <div className="max-w-4xl mx-auto w-full">
              {/* Profile Form & Info Card */}
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-sm flex flex-col h-full min-h-[600px]">
                <div className="p-4 md:p-8 flex-grow">
                  <div className="space-y-6">

                    <div className="col-span-full mt-8 bg-surface rounded-lg p-4 md:p-8 border border-outline-variant/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Left side: Photo, Name, Designation, Mail */}
                        <div className="flex items-center gap-6">
                          {renderAvatar(profile.avatar, profile.name, "w-24 h-24 rounded-full border-2 border-white shadow-sm text-[28px]", "text-[28px]")}
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
                                  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })
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
        </div>
      </main>
    </div>
  )
}


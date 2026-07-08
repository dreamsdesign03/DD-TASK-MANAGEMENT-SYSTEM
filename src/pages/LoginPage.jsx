import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import SelectDropdown from '../components/SelectDropdown'

const LOGO_SRC = '/logo.png'
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcHV_bqFjFK46U6B_bzRXPANKd57RmBNtudNckMxii1jz2nPNPV5l8hltcW8_dBz7w/exec'

// Animated chevron arrow for the button
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [pendingApprovalEmail, setPendingApprovalEmail] = useState(null)

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [systemRole, setSystemRole] = useState('Employee')

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setProfile } = useApp()
  const isElectron = /electron/i.test(navigator.userAgent)

  useEffect(() => {
    if (isElectron && window.require) {
      const { ipcRenderer } = window.require('electron')

      const processDeepLink = async (url) => {
        try {
          const urlObj = new URL(url)
          if (urlObj.protocol === 'dreamsdesk:') {
            let linkEmail = urlObj.searchParams.get('email')
            if (linkEmail) {
              linkEmail = linkEmail.replace(/\/$/, '')
              setLoading(true)
              const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'google_login', email: linkEmail })
              })
              const data = await res.json()
              setLoading(false)
              if (data.ok && data.authenticated && data.user) {
                setProfile({
                  name: data.user['Full Name'],
                  role: data.user['Role'],
                  email: data.user['Email Address'],
                  phone: data.user['Phone'] || '',
                  joined: data.user['Joined Date'] || '',
                  department: data.user['Department'] || '',
                  systemRole: data.user['System Role'] || 'Employee',
                  location: 'Remote',
                  avatar: '',
                })
                navigate('/tasks')
              } else {
                setErrorMsg('Deep link login failed or account not approved.')
              }
            }
          }
        } catch (err) {
          console.error('Deep link error:', err)
          setLoading(false)
        }
      }

      ipcRenderer.invoke('get-initial-deep-link').then((url) => {
        if (url) processDeepLink(url)
      }).catch(err => console.warn('IPC invoke error:', err))

      const handleDeepLink = (e, url) => processDeepLink(url)
      ipcRenderer.on('deep-link', handleDeepLink)

      return () => ipcRenderer.removeListener('deep-link', handleDeepLink)
    }
  }, [isElectron, navigate, setProfile])

  useEffect(() => {
    let intervalId = null;
    if (pendingApprovalEmail) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'google_login', email: pendingApprovalEmail })
          });
          const data = await res.json();
          if (data.ok && data.authenticated && data.user) {
            clearInterval(intervalId);
            setPendingApprovalEmail(null);
            setProfile({
              name: data.user['Full Name'],
              role: data.user['Role'],
              email: data.user['Email Address'],
              department: data.user['Department'],
              phone: data.user['Phone'] || '',
              joined: data.user['Joined Date'] || '',
              systemRole: data.user['System Role'] || 'Employee',
              avatar: ''
            });
            navigate('/tasks');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingApprovalEmail, navigate, setProfile]);

  const handleManualAuth = async (e) => {
    e.preventDefault()

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (isRegisterMode) {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            email: email.trim(),
            name: name.trim(),
            phone: phone.trim(),
            role: role.trim(),
            department: department.trim(),
            systemRole: systemRole
          })
        })
        const data = await res.json()
        if (data.ok) {
          setSuccessMsg('Registration submitted! An email has been sent to the admin. You will be able to log in once approved.')
          setIsRegisterMode(false)
          setPendingApprovalEmail(email.trim())
          setPassword('')
        } else {
          setErrorMsg(data.error || 'Registration failed.')
        }
      } else {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'login',
            email: email.trim(),
            password: password
          })
        })
        const data = await res.json()

        if (data.ok && data.authenticated && data.user) {
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('desktop') === 'true') {
            window.location.href = "dreamsdesk://login?email=${encodeURIComponent(data.user['Email Address'])}"
            return
          }
          setProfile({
            name: data.user['Full Name'],
            role: data.user['Role'],
            email: data.user['Email Address'],
            phone: data.user['Phone'] || '',
            joined: data.user['Joined Date'] || '',
            department: data.user['Department'] || '',
            systemRole: data.user['System Role'] || 'Employee',
            location: 'Remote',
            avatar: '',
          })
          navigate('/tasks')
        } else {
          setErrorMsg(data.error || 'Invalid credentials or Not authorized.')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Network error. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      const userEmail = decoded.email || ''

      setLoading(true)
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'google_login', email: userEmail })
      })
      const data = await res.json()
      setLoading(false)

      if (data.ok && data.authenticated && data.user) {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('desktop') === 'true') {
          window.location.href = "dreamsdesk://login?email=${encodeURIComponent(data.user['Email Address'])}"
          return
        }
        setProfile({
          name: data.user['Full Name'],
          role: data.user['Role'],
          email: data.user['Email Address'],
          department: data.user['Department'],
          phone: data.user['Phone'] || '',
          joined: data.user['Joined Date'] || '',
          systemRole: data.user['System Role'] || 'Employee',
          avatar: decoded.picture || ''
        })
        navigate('/tasks')
      } else if (data.error === "Admin not approved") {
        setErrorMsg('Admin not approved. Please wait for the admin to activate your account.')
        setPendingApprovalEmail(userEmail)
      } else if (data.error === "not_registered") {
        setIsRegisterMode(true)
        setEmail(userEmail)
        setName(decoded.name || '')
        setErrorMsg('')
        setSuccessMsg('Google connected! Please complete your profile details to submit your registration.')
      } else {
        setErrorMsg('Google login failed. ' + (data.error || ''))
      }
    } catch (err) {
      console.error('Google Sign In Error:', err)
      setLoading(false)
      setErrorMsg('Google login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-stretch justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F3F1FA 0%, #E9E4F9 100%)' }}>

      {/* Atmospheric Blobs */}
      <div
        className="absolute top-0 left-0 rounded-full pointer-events-none"
        style={{
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, #f472b6, transparent 70%)',
          opacity: 0.5, filter: 'blur(60px)',
          transform: 'translate(-40%, -40%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 rounded-full pointer-events-none"
        style={{
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, #BFDBFE, transparent 70%)',
          opacity: 0.5, filter: 'blur(60px)',
          transform: 'translate(40%, 40%)',
        }}
      />

      {/* MAIN CARD */}
      <main
        className="relative z-10 w-full flex flex-col md:flex-row animate-fade-in-up"
        style={{
          maxWidth: '1280px',
          margin: '2rem auto',
          borderRadius: '28px',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 4rem)',
          boxShadow: '0 24px 80px rgba(91,33,182,0.18), 0 4px 24px rgba(0,0,0,0.08)',
        }}
      >

        {/* LEFT PANEL */}
        <section
          className="w-full md:w-1/2 flex flex-col items-center justify-between text-white"
          style={{
            background: 'linear-gradient(160deg, #702c91 0%, #ec008c 100%)',
            padding: 'clamp(3rem, 6vw, 5rem) clamp(2.5rem, 5vw, 4rem)',
          }}
        >
          {/* Top spacer */}
          <div />

          {/* Hero Logo */}
          <div className="flex flex-col items-center gap-8 text-center">
            <img
              src={LOGO_SRC}
              alt="Dreamsdesk"
              className="animate-float"
              style={{
                width: 'clamp(200px, 32vw, 300px)',
                height: 'auto',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1) drop-shadow(0 20px 48px rgba(196,181,253,0.3))',
                opacity: 0.93,
              }}
            />
            <p style={{
              color: '#C4AEFF',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}>
              Track. Collaborate. Deliver.
            </p>
          </div>

          {/* Quote Block */}
          <div
            className="w-full"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '16px',
              padding: '1.5rem 2rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p style={{
              color: '#D8C9F5',
              fontSize: '14px',
              lineHeight: '1.8',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              "Empowering teams to visualize productivity and streamline internal workflows with executive precision."
            </p>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section
          className="w-full md:w-1/2 bg-white flex flex-col items-center justify-center overflow-y-auto"
          style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(2.5rem, 5vw, 5rem)' }}
        >
          <div className="w-full flex flex-col items-center" style={{ maxWidth: '400px' }}>

            {/* Heading */}
            <h1
              style={{
                fontSize: 'clamp(28px, 4vw, 36px)',
                fontWeight: 800,
                color: '#1E1B2E',
                marginBottom: '10px',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              {isRegisterMode ? 'Complete Registration' : 'Welcome Back'}
            </h1>
            <p style={{ fontSize: '15px', color: '#6B7280', textAlign: 'center', marginBottom: '40px', lineHeight: 1.6 }}>
              {isRegisterMode ? 'Please provide your details to request access.' : 'Sign in to your Dreamsdesk account to continue'}
            </p>

            {errorMsg && (
              <div className="mb-4 w-full p-3 bg-red-50 border border-red-200 text-red-600 text-[14px] rounded-lg">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 w-full p-3 bg-green-50 border border-green-200 text-green-700 text-[14px] rounded-lg">
                {successMsg}
              </div>
            )}

            <form className="w-full space-y-4" onSubmit={handleManualAuth}>
              {isRegisterMode && (
                <div className="relative">
                  <input
                    id="name" required placeholder=" " value={name} onChange={(e) => setName(e.target.value)}
                    className="block w-full h-[54px] px-4 pt-2 text-[#1E1B2E] bg-transparent border border-gray-200 rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#702c91] focus:border-[#702c91] peer transition-all duration-200"
                  />
                  <label htmlFor="name" className="absolute text-[14px] text-gray-400 duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-[#702c91] peer-focus:bg-white peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">Full Name</label>
                </div>
              )}

              {isRegisterMode && (
                <div className="relative">
                  <input
                    id="email" type="email" required placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} disabled={isRegisterMode && email.length > 0}
                    className="block w-full h-[54px] px-4 pt-2 text-[#1E1B2E] bg-transparent border border-gray-200 rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#702c91] focus:border-[#702c91] peer transition-all duration-200 disabled:opacity-60 disabled:bg-gray-50"
                  />
                  <label htmlFor="email" className="absolute text-[14px] text-gray-400 duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-[#702c91] peer-focus:bg-white peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">Email Address</label>
                </div>
              )}

              {isRegisterMode && (
                <>
                  <div className="relative">
                    <input
                      id="role" required placeholder=" " value={role} onChange={(e) => setRole(e.target.value)}
                      className="block w-full h-[54px] px-4 pt-2 text-[#1E1B2E] bg-transparent border border-gray-200 rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#702c91] focus:border-[#702c91] peer transition-all duration-200"
                    />
                    <label htmlFor="role" className="absolute text-[14px] text-gray-400 duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-[#702c91] peer-focus:bg-white peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">Role (e.g. Designer)</label>
                  </div>
                  <div className="relative">
                    <input
                      id="department" required placeholder=" " value={department} onChange={(e) => setDepartment(e.target.value)}
                      className="block w-full h-[54px] px-4 pt-2 text-[#1E1B2E] bg-transparent border border-gray-200 rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#702c91] focus:border-[#702c91] peer transition-all duration-200"
                    />
                    <label htmlFor="department" className="absolute text-[14px] text-gray-400 duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-[#702c91] peer-focus:bg-white peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">Department</label>
                  </div>
                  <div className="relative">
                    <input
                      id="phone" required placeholder=" " value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="block w-full h-[54px] px-4 pt-2 text-[#1E1B2E] bg-transparent border border-gray-200 rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-[#702c91] focus:border-[#702c91] peer transition-all duration-200"
                    />
                    <label htmlFor="phone" className="absolute text-[14px] text-gray-400 duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-[#702c91] peer-focus:bg-white peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">Phone Number</label>
                  </div>
                  <div className="relative">
                    <SelectDropdown dropdownUp={true} value={systemRole} onChange={setSystemRole} options={['Employee', 'Manager', 'Admin', 'Sales', 'HR', 'Accountant']} style={{ width: '100%', height: 54, fontSize: 14 }} />
                  </div>
                </>
              )}

              {isRegisterMode && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[58px] bg-gradient-to-r from-[#702c91] to-[#ec008c] text-white font-bold tracking-wide rounded-[16px] flex items-center justify-center hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md mt-8"
                >
                  {loading ? 'Processing...' : 'Submit Registration'}
                </button>
              )}

              {!isRegisterMode && !isElectron && (
                <div className="flex justify-center w-full google-login-wrapper mt-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setErrorMsg('Google login failed.')}
                    shape="pill"
                    size="large"
                    theme="outline"
                    width="360"
                    text="continue_with"
                  />
                </div>
              )}

              {isElectron && !isRegisterMode && (
                <div className="mt-6 flex flex-col items-center space-y-3">
                  <div className="text-gray-400 text-sm font-medium">Or</div>
                  <button
                    type="button"
                    onClick={() => window.require('electron').shell.openExternal('https://dd-task-management-system.vercel.app/login?desktop=true')}
                    className="w-full h-[54px] bg-white border border-gray-200 text-[#1E1B2E] font-medium tracking-wide rounded-[14px] flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-3" />
                    Sign in instantly via Web Browser
                  </button>
                </div>
              )}

              <div className="mt-6 text-center text-[13px] text-gray-500">
                {isRegisterMode && (
                  <button type="button" onClick={() => { setIsRegisterMode(false); setErrorMsg(''); setSuccessMsg('') }} className="text-[#702c91] font-semibold hover:underline">Cancel & Return to Login</button>
                )}
              </div>

            </form>

            {/* Footer */}
            {!isRegisterMode && (
              <footer className="mt-12 text-center">
                <p style={{ fontSize: '12px', color: '#f472b6' }}>© 2026 Dreamsdesign. All rights reserved.</p>
              </footer>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}


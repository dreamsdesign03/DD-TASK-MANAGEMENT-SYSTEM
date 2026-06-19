import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'

/* â”€â”€â”€ Dreamsdesk Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const LOGO_SRC = '/logo.png'
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqINCBhGlD8Ak13YGj53fCPCwPz-rn6K13RC9sZgIE77QFDVgZ0dWMLF_6tKHeKmPy/exec'

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
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

  const navigate = useNavigate()
  const { setProfile, employees } = useApp()

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
              avatar: ''
            });
            navigate('/tasks');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000); // Poll every 3 seconds
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
        // Registration
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'register',
            email: email.trim(),
            name: name.trim(),
            phone: phone.trim(),
            role: role.trim(),
            department: department.trim()
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
        // Login
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
          setProfile({
            name: data.user['Full Name'],
            role: data.user['Role'],
            email: data.user['Email Address'],
            phone: data.user['Phone'] || '',
            joined: data.user['Joined Date'] || '',
            department: data.user['Department'] || '',
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
        setProfile({
          name: data.user['Full Name'],
          role: data.user['Role'],
          email: data.user['Email Address'],
          department: data.user['Department'],
          phone: data.user['Phone'] || '',
          joined: data.user['Joined Date'] || '',
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
    <main className="flex min-h-screen w-full">
      {/* â”€â”€ LEFT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #1b0a33 0%, #461466 100%)' }}>
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="mb-10 group relative cursor-pointer inline-block">
            <div className="absolute inset-0 bg-surface-container-lowest opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-700 rounded-full pointer-events-none" />
            
            <img
              alt="Dreamsdesk Logo"
              className="max-w-[280px] h-auto opacity-0"
              src={LOGO_SRC}
            />
            
            <div
              className="absolute inset-0 transition-transform duration-700 hover-bird-fly z-10"
              style={{
                backgroundColor: '#e9b3ff',
                WebkitMaskImage: `url(${LOGO_SRC})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${LOGO_SRC})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
              aria-hidden="true"
            />
          </div>
          <h2 className="text-white font-headline-sm text-[20px] font-semibold tracking-wider uppercase opacity-90 mb-4">
            Track. Collaborate. Deliver.
          </h2>
          <div className="mt-12 p-8 rounded-2xl max-w-md bg-surface-container-lowest/[0.03] border border-white/[0.08] shadow-2xl backdrop-blur-sm">
            <p className="text-white/[0.85] text-[15px] font-body-md leading-relaxed tracking-wide">
              "Empowering teams to visualize productivity and streamline internal workflows with executive precision."
            </p>
          </div>
        </div>
      </section>

      {/* â”€â”€ RIGHT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center px-6 md:px-margin_desktop py-12 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          <header className={`mb-8 ${!isRegisterMode ? 'text-center flex flex-col items-center' : ''}`}>
            {!isRegisterMode && (
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl">waving_hand</span>
              </div>
            )}
            <h1 className="text-[32px] font-headline-lg font-bold text-on-surface mb-3 tracking-tight">
              {isRegisterMode ? 'Complete Registration' : 'Welcome Back'}
            </h1>
            <p className="text-[15px] font-body-md text-secondary">
              {isRegisterMode ? 'Please provide your details to request access.' : 'Sign in to your Dreamsdesk account to continue'}
            </p>
          </header>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error text-[14px] rounded-lg">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-[14px] rounded-lg">
              {successMsg}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleManualAuth}>
            {isRegisterMode && (
              <div className="login-input relative">
                <input
                  id="name" required placeholder=" " value={name} onChange={(e) => setName(e.target.value)}
                  className="block w-full h-[54px] px-4 pt-2 text-on-surface bg-transparent border border-outline rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary peer transition-all duration-200"
                />
                <label htmlFor="name" className="absolute text-[14px] text-secondary duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-primary peer-focus:bg-surface-container-lowest peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-surface-container-lowest peer-[:not(:placeholder-shown)]:px-1">Full Name</label>
              </div>
            )}

            {isRegisterMode && (
              <div className="login-input relative">
                <input
                  id="email" type="email" required placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} disabled={isRegisterMode && email.length > 0}
                  className="block w-full h-[54px] px-4 pt-2 text-on-surface bg-transparent border border-outline rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary peer transition-all duration-200 disabled:opacity-60 disabled:bg-surface"
                />
                <label htmlFor="email" className="absolute text-[14px] text-secondary duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-primary peer-focus:bg-surface-container-lowest peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-surface-container-lowest peer-[:not(:placeholder-shown)]:px-1">Email Address</label>
              </div>
            )}



            {isRegisterMode && (
              <>
                <div className="login-input relative">
                  <input
                    id="role" required placeholder=" " value={role} onChange={(e) => setRole(e.target.value)}
                    className="block w-full h-[54px] px-4 pt-2 text-on-surface bg-transparent border border-outline rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary peer transition-all duration-200"
                  />
                  <label htmlFor="role" className="absolute text-[14px] text-secondary duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-primary peer-focus:bg-surface-container-lowest peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-surface-container-lowest peer-[:not(:placeholder-shown)]:px-1">Role (e.g. Designer)</label>
                </div>
                <div className="login-input relative">
                  <input
                    id="department" required placeholder=" " value={department} onChange={(e) => setDepartment(e.target.value)}
                    className="block w-full h-[54px] px-4 pt-2 text-on-surface bg-transparent border border-outline rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary peer transition-all duration-200"
                  />
                  <label htmlFor="department" className="absolute text-[14px] text-secondary duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-primary peer-focus:bg-surface-container-lowest peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-surface-container-lowest peer-[:not(:placeholder-shown)]:px-1">Department</label>
                </div>
                <div className="login-input relative">
                  <input
                    id="phone" required placeholder=" " value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="block w-full h-[54px] px-4 pt-2 text-on-surface bg-transparent border border-outline rounded-[10px] appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary peer transition-all duration-200"
                  />
                  <label htmlFor="phone" className="absolute text-[14px] text-secondary duration-200 transform -translate-y-1/2 top-1/2 left-4 z-10 origin-[0] peer-focus:scale-[0.85] peer-focus:-translate-y-[24px] peer-focus:text-primary peer-focus:bg-surface-container-lowest peer-focus:px-1 pointer-events-none peer-[:not(:placeholder-shown)]:scale-[0.85] peer-[:not(:placeholder-shown)]:-translate-y-[24px] peer-[:not(:placeholder-shown)]:bg-surface-container-lowest peer-[:not(:placeholder-shown)]:px-1">Phone Number</label>
                </div>
              </>
            )}



            {isRegisterMode && (
              <button
                id="login-btn"
                type="submit"
                disabled={loading}
                className="w-full h-[54px] bg-primary text-on-primary font-label-lg font-medium tracking-wide rounded-[10px] flex items-center justify-center hover:bg-primary-container active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm mt-8"
              >
                {loading ? 'Processing...' : 'Submit Registration'}
              </button>
            )}

            {!isRegisterMode && (
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

            <div className="mt-6 text-center text-[13px] text-secondary">
              {isRegisterMode && (
                <button type="button" onClick={() => { setIsRegisterMode(false); setErrorMsg(''); setSuccessMsg('') }} className="text-primary font-semibold hover:underline">Cancel & Return to Login</button>
              )}
            </div>

          </form>



        </div>
      </section>
    </main>
  )
}



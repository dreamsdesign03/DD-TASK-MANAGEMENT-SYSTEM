import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { isElectron } from '../utils/isElectron'

export default function PunchOutReminder() {
  const { isPunchedIn, handlePunchOut } = useApp()
  const [visible, setVisible] = useState(false)
  const [shown, setShown] = useState(false)
  const [wasPunchedIn, setWasPunchedIn] = useState(isPunchedIn)

  if (isPunchedIn !== wasPunchedIn) {
    setWasPunchedIn(isPunchedIn)
    setShown(false)
    setVisible(false)
  }

  useEffect(() => {
    if (!isPunchedIn || isElectron()) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isPunchedIn])

  useEffect(() => {
    if (!isPunchedIn) return
    const onExitIntent = (e) => {
      if (e.clientY > 0 || shown) return
      setShown(true)
      setVisible(true)
    }
    document.documentElement.addEventListener('mouseleave', onExitIntent)
    return () => document.documentElement.removeEventListener('mouseleave', onExitIntent)
  }, [isPunchedIn, shown])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setVisible(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  if (!isPunchedIn || !visible) return null

  const handleConfirmPunchOut = () => {
    setVisible(false)
    handlePunchOut?.()
  }

  return (
    <div
      role="presentation"
      onClick={() => setVisible(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.28)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '88px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="punch-out-reminder-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '24px 24px 20px',
          width: 360,
          maxWidth: '90vw',
          boxShadow: '0 24px 64px rgba(112,44,145,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'scaleIn 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#D97706' }}>logout</span>
        </div>
        <h2
          id="punch-out-reminder-title"
          style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1E1B2E', fontFamily: 'Inter,sans-serif', textAlign: 'center' }}
        >
          Leaving already?
        </h2>
        <p
          style={{ margin: '8px 0 0', fontSize: 13, color: '#6B7280', fontFamily: 'Inter,sans-serif', textAlign: 'center', lineHeight: 1.6 }}
        >
          Please make sure to Punch Out before leaving!
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, width: '100%' }}>
          <button
            type="button"
            onClick={() => setVisible(false)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              border: '1.5px solid #E5E7EB',
              background: '#fff',
              color: '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'Inter,sans-serif',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleConfirmPunchOut}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(to right, #DC2626, #EF4444)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'Inter,sans-serif',
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Punch Out
          </button>
        </div>
      </div>
    </div>
  )
}

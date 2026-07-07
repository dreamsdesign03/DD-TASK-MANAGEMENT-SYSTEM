import React, { useState, useEffect, useRef } from 'react'

export default function SelectDropdown({ value, onChange, options, style = {}, placeholder, disabled = false, dropdownUp = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (disabled) {
    return (
      <div style={{
        ...style,
        width: style.width || '100%',
        background: '#F3F4F6',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 13,
        fontWeight: 600,
        color: '#9CA3AF',
        cursor: 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}>
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
          {value || placeholder || 'Select'}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9CA3AF' }}>expand_more</span>
      </div>
    )
  }

  return (
    <div ref={selectRef} style={{ position: 'relative', width: style.width || '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...style,
          width: '100%',
          background: 'white',
          border: `1px solid ${isOpen ? '#ec008c' : '#E5E7EB'}`,
          borderRadius: 12,
          boxShadow: isOpen ? '0 0 0 3px rgba(139,92,246,0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 600,
          color: value ? '#1E1B2E' : '#9CA3AF',
          cursor: 'pointer',
          transition: 'all 0.15s',
          height: 44,
          overflow: 'hidden'
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#ec008c'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#E5E7EB'
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'
          }
        }}
      >
        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
          {value || placeholder || 'Select'}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6B7280', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
      </div>
      {isOpen && (
        <div className={`hide-scrollbar ${dropdownUp ? '' : 'animate-fade-in-up'}`} style={{
          position: 'absolute',
          [dropdownUp ? 'bottom' : 'top']: '100%',
          left: 0,
          width: '100%',
          [dropdownUp ? 'marginBottom' : 'marginTop']: 8,
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(91,33,182,0.15)',
          border: '1px solid #F5F3FF',
          zIndex: 100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 8,
          gap: 4,
          maxHeight: 250,
          overflowY: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
          {options.map(opt => (
            <div
              key={opt.value || opt}
              onClick={() => { onChange(opt.value || opt); setIsOpen(false) }}
              style={{
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: (opt.value || opt) === value ? '#702c91' : '#4B5563',
                background: (opt.value || opt) === value ? '#F5F3FF' : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => { if ((opt.value || opt) !== value) e.currentTarget.style.background = '#F9FAFB' }}
              onMouseLeave={e => { if ((opt.value || opt) !== value) e.currentTarget.style.background = 'transparent' }}
            >
              {opt.label || opt.value || opt}
              {(opt.value || opt) === value && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

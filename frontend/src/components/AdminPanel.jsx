import { useState, useEffect, useRef } from 'react'
import { getAdminConfig, setAdminProvider } from '../api/client'

const PROVIDER_META = {
  claude: {
    label: 'Claude',
    color: '#d97757',
    glow: 'rgba(217, 119, 87, 0.3)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" fill="#d97757" />
        <path d="M16 32 L24 14 L32 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M18.5 27 L29.5 27" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  gemini: {
    label: 'Gemini',
    color: '#4285f4',
    glow: 'rgba(66, 133, 244, 0.3)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" fill="#4285f4" />
        <path d="M24 8 C24 8 28 20 36 24 C28 28 24 40 24 40 C24 40 20 28 12 24 C20 20 24 8 24 8Z" fill="white" />
      </svg>
    ),
  },
}

function ModelSelect({ providerKey, models, activeModel, onSelect, disabled, accentColor }) {
  return (
    <div style={{ marginTop: 8, paddingLeft: 42 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Model
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {models.map((m) => {
          const isActive = m.id === activeModel
          return (
            <button
              key={m.id}
              onClick={() => !disabled && !isActive && onSelect(providerKey, m.id)}
              disabled={disabled || isActive}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: isActive ? `${accentColor}12` : 'transparent',
                border: `1px solid ${isActive ? accentColor + '40' : 'var(--color-border)'}`,
                borderRadius: 6,
                cursor: isActive || disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                transition: 'all var(--transition)',
                textAlign: 'left',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !disabled) e.currentTarget.style.borderColor = accentColor + '30'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? accentColor : 'var(--color-text-primary)' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  {m.note}
                </div>
              </div>
              {isActive && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    getAdminConfig()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const applyUpdate = async (update) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const updated = await setAdminProvider(update)
      setConfig(updated)
      const providerLabel = PROVIDER_META[updated.provider]?.label || updated.provider
      if (update.provider) setSuccessMsg(`Switched to ${providerLabel}`)
      else if (update.claude_model || update.gemini_model) {
        const modelId = update.claude_model || update.gemini_model
        const allModels = [...(updated.claude_models || []), ...(updated.gemini_models || [])]
        const found = allModels.find((m) => m.id === modelId)
        setSuccessMsg(`Model set to ${found?.label || modelId}`)
      }
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleProviderSwitch = (provider) => applyUpdate({ provider })
  const handleModelSelect = (providerKey, modelId) => {
    const key = providerKey === 'claude' ? 'claude_model' : 'gemini_model'
    applyUpdate({ [key]: modelId })
  }

  const activeProvider = config?.provider
  const activeMeta = PROVIDER_META[activeProvider] || {}

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 900 }}>
      {/* Gear button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Admin — AI provider & model settings"
        aria-expanded={open}
        style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: open ? 'var(--color-surface-2)' : 'var(--color-surface)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.15)' : 'var(--color-border)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all var(--transition)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          outline: 'none',
          position: 'relative',
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent)' }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2"
          style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(45deg)' : 'none' }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M21 12h-2M5 12H3M12 21v-2M12 5V3" />
        </svg>
        {/* Active provider dot */}
        {activeProvider && (
          <span style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 10, height: 10, borderRadius: '50%',
            background: activeMeta.color || 'var(--color-accent)',
            border: '2px solid var(--color-bg)',
            boxShadow: `0 0 6px ${activeMeta.glow || 'var(--color-accent-glow)'}`,
          }} />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="AI Provider & Model Settings"
          style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', left: 0,
            width: 300,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.2s ease forwards',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>AI Provider & Model</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Admin — runtime switch</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 100, fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Admin
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 12, maxHeight: 480, overflowY: 'auto' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-sm)' }} />)}
              </div>
            )}

            {!loading && error && (
              <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#f87171' }}>
                {error}
              </div>
            )}

            {!loading && config && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['claude', 'gemini'].map((key) => {
                  const meta = PROVIDER_META[key]
                  const isActive = config.provider === key
                  const isAvailable = config.available_providers?.includes(key)
                  const models = key === 'claude' ? config.claude_models : config.gemini_models
                  const activeModel = key === 'claude' ? config.claude_model : config.gemini_model

                  return (
                    <div key={key} style={{
                      border: `1px solid ${isActive ? meta.color + '50' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? `${meta.color}0a` : 'var(--color-surface-2)',
                      overflow: 'hidden',
                      opacity: isAvailable ? 1 : 0.45,
                      transition: 'all var(--transition)',
                    }}>
                      {/* Provider row */}
                      <button
                        onClick={() => isAvailable && !busy && !isActive && handleProviderSwitch(key)}
                        disabled={!isAvailable || busy || isActive}
                        style={{
                          width: '100%', padding: '10px 12px',
                          background: 'transparent', border: 'none',
                          cursor: isAvailable && !isActive && !busy ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', gap: 10,
                          outline: 'none', textAlign: 'left',
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: isActive ? `0 0 12px ${meta.glow}` : 'none', transition: 'box-shadow var(--transition)' }}>
                          {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? meta.color : 'var(--color-text-primary)' }}>
                            {meta.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isAvailable
                              ? (models?.find((m) => m.id === activeModel)?.label || activeModel || '—')
                              : 'API key not set'}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {busy && isActive ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                          ) : isActive ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: meta.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, animation: 'pulse 2s ease infinite' }} />
                              Active
                            </span>
                          ) : isAvailable ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          ) : null}
                        </div>
                      </button>

                      {/* Model selector — only when this provider is active */}
                      {isActive && isAvailable && models?.length > 0 && (
                        <div style={{ padding: '0 12px 12px' }}>
                          <ModelSelect
                            providerKey={key}
                            models={models}
                            activeModel={activeModel}
                            onSelect={handleModelSelect}
                            disabled={busy}
                            accentColor={meta.color}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {successMsg && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 6, animation: 'fadeInUp 0.2s ease forwards' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {successMsg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.15)' }}>
            Set <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>AI_PROVIDER</code>, <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>CLAUDE_MODEL</code>, <code style={{ background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>GEMINI_MODEL</code> in .env for defaults
          </div>
        </div>
      )}
    </div>
  )
}

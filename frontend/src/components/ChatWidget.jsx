import { useState, useEffect, useRef, useCallback } from 'react'
import { startSession, sendMessage, uploadResume } from '../api/client'

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            animation: `dotBounce 1.2s ease ${i * 0.2}s infinite`,
            display: 'block',
          }}
        />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'fadeInUp 0.25s ease forwards',
        marginBottom: '10px',
      }}
    >
      {!isUser && (
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          marginRight: '8px',
          marginTop: '2px',
        }}>
          L
        </div>
      )}
      <div style={{ maxWidth: '75%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'var(--color-accent)' : 'var(--color-surface-2)',
          color: isUser ? '#fff' : 'var(--color-text-primary)',
          fontSize: '14px',
          lineHeight: 1.6,
          border: isUser ? 'none' : '1px solid var(--color-border)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          marginTop: '4px',
          textAlign: isUser ? 'right' : 'left',
          paddingLeft: isUser ? 0 : '4px',
          paddingRight: isUser ? '4px' : 0,
        }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function ApplicationConfirmation() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      margin: '8px 0',
      textAlign: 'center',
      animation: 'fadeInUp 0.4s ease forwards',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(34,197,94,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)', marginBottom: '6px' }}>
        Application Received
      </p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        Thank you for applying! Our team will review your profile and get back to you soon.
      </p>
    </div>
  )
}

function ApplicationRejection() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      margin: '8px 0',
      textAlign: 'center',
      animation: 'fadeInUp 0.4s ease forwards',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(245,158,11,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '6px' }}>
        Application Closed
      </p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        Thank you for your time. We wish you all the best in your search.
      </p>
    </div>
  )
}

export default function ChatWidget({ job, onClose }) {
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeError, setResumeError] = useState(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [initError, setInitError] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages, isLoading])

  const initialized = useRef(false)

  // Initialize session on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const jobUrl = window.location.href
    setIsLoading(true)
    startSession(jobUrl)
      .then(async ({ session_id }) => {
        setSessionId(session_id)
        // Get Lumina's opening message
        const res = await sendMessage(session_id, `Hi! I'm interested in the ${job.title} position.`)
        appendMessage('assistant', res.reply)
      })
      .catch((e) => setInitError(e.message))
      .finally(() => setIsLoading(false))
  }, [job.title])

  // Focus input when session ready
  useEffect(() => {
    if (sessionId && !isLoading) inputRef.current?.focus()
  }, [sessionId, isLoading])

  const appendMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }])
  }

  // Shared helper: send a message to the API and handle the response
  const dispatchMessage = useCallback(async (text) => {
    setIsLoading(true)
    try {
      const res = await sendMessage(sessionId, text)
      appendMessage('assistant', res.reply)
      if (res.is_complete) {
        setIsComplete(true)
        if (res.is_rejected) setIsRejected(true)
      }
    } catch (e) {
      appendMessage('assistant', `Sorry, I ran into an issue: ${e.message}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !sessionId || isComplete) return
    const text = input.trim()
    setInput('')
    appendMessage('user', text)
    await dispatchMessage(text)
  }, [input, isLoading, sessionId, isComplete, dispatchMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') onClose()
  }

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return
    setResumeError(null)

    // If session is ready, upload immediately and notify Aria
    if (sessionId && !isComplete && !resumeUploading) {
      setResumeFile(file)
      setResumeUploading(true)
      try {
        await uploadResume(sessionId, file)
        setResumeUploaded(true)
        setResumeFile(null)
        // Show a user bubble so the conversation reflects the upload
        appendMessage('user', `📄 Attached resume: ${file.name}`)
        // Tell Aria so she re-assesses which fields are already known
        await dispatchMessage(
          `I've just uploaded my resume (${file.name}). Please review it and skip asking for any information already in it.`
        )
      } catch (e) {
        setResumeError(`Resume upload failed: ${e.message}`)
        setResumeFile(null)
      } finally {
        setResumeUploading(false)
      }
    } else {
      // Session not ready yet — hold file and upload on first send
      setResumeFile(file)
    }
  }, [sessionId, isComplete, resumeUploading, dispatchMessage])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  // Keyboard accessibility: ESC closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeInUp 0.2s ease forwards',
        }}
        aria-hidden="true"
      />

      {/* Widget */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Apply for ${job.title}`}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          height: '600px',
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), var(--shadow-glow)',
          animation: 'slideInBottom 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 0 12px var(--color-accent-glow)',
          }}>
            Lumina
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Lumina</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              AI Recruiter · {job.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', animation: 'pulse 2s ease infinite' }} />
            Online
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '6px', minWidth: 32, flexShrink: 0 }}
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {initError && (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#f87171', marginBottom: '12px' }}>
              {initError}
            </div>
          )}

          {messages.length === 0 && isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: '8px', marginTop: '2px' }}>A</div>
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '16px 16px 16px 4px' }}>
                <TypingIndicator />
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {isLoading && messages.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: '8px', marginTop: '2px' }}>A</div>
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '16px 16px 16px 4px' }}>
                <TypingIndicator />
              </div>
            </div>
          )}

          {isComplete && !isRejected && <ApplicationConfirmation />}
          {isComplete && isRejected && <ApplicationRejection />}

          <div ref={messagesEndRef} />
        </div>

        {/* Resume Upload Area */}
        {!isComplete && (
          <div
            style={{ padding: '0 16px', flexShrink: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {resumeError && (
              <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
                {resumeError}
              </div>
            )}

            {resumeUploaded ? (
              /* Uploaded confirmation strip */
              <div style={{
                padding: '8px 14px',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: '12px', color: 'var(--color-success)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Resume read by Lumina
                </span>
                <button
                  onClick={() => { setResumeUploaded(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '2px', display: 'flex' }}
                  aria-label="Upload different resume"
                  title="Upload a different resume"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            ) : (
              /* Upload zone */
              <div
                style={{
                  padding: '10px 14px',
                  background: isDragging ? 'rgba(108,99,255,0.08)' : resumeUploading ? 'rgba(108,99,255,0.05)' : 'var(--color-surface-2)',
                  border: `1px dashed ${isDragging ? 'var(--color-accent)' : resumeUploading ? 'rgba(108,99,255,0.4)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: resumeUploading ? 'default' : 'pointer',
                  transition: 'all var(--transition)',
                  marginBottom: '10px',
                  opacity: resumeUploading ? 0.8 : 1,
                }}
                onClick={() => !resumeUploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (!resumeUploading && (e.key === 'Enter' || e.key === ' ')) fileInputRef.current?.click() }}
                aria-label="Upload resume"
              >
                {resumeUploading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                )}
                <span style={{ fontSize: '12px', color: resumeUploading ? 'var(--color-accent-light)' : resumeFile ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {resumeUploading ? 'Uploading & reading resume…' : resumeFile ? resumeFile.name : 'Attach resume (PDF or TXT) — Lumina will read it instantly'}
                </span>
                {resumeFile && !resumeUploading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setResumeFile(null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '2px', display: 'flex', flexShrink: 0 }}
                    aria-label="Remove resume"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  tabIndex={-1}
                />
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {!isComplete && (
          <div style={{
            padding: '0 16px 16px',
            flexShrink: 0,
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              rows={1}
              disabled={!sessionId || isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
                transition: 'border-color var(--transition)',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(108,99,255,0.5)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
            />
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !sessionId}
              style={{ padding: '10px 14px', flexShrink: 0 }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        )}

        {isComplete && (
          <div style={{ padding: '12px 16px', textAlign: 'center', flexShrink: 0, borderTop: '1px solid var(--color-border)' }}>
            <button className="btn-ghost" onClick={onClose} style={{ width: '100%' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </>
  )
}

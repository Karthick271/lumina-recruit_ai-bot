import { useState, useEffect } from 'react'
import { getJobs } from '../api/client'
import ChatWidget from './ChatWidget'

const DEPT_BADGE = {
  Engineering: 'badge-engineering',
  Design: 'badge-design',
  Analytics: 'badge-analytics',
}

function JobCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '280px' }}>
      <div className="skeleton" style={{ height: '20px', width: '60%' }} />
      <div className="skeleton" style={{ height: '14px', width: '30%', borderRadius: '100px' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ height: '14px', width: '80px' }} />
        <div className="skeleton" style={{ height: '14px', width: '60px' }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '13px', width: '100%' }} />
        <div className="skeleton" style={{ height: '13px', width: '85%' }} />
      </div>
      <div className="skeleton" style={{ height: '38px', width: '120px', borderRadius: '8px' }} />
    </div>
  )
}

function JobCard({ job, onApply }) {
  const badgeClass = DEPT_BADGE[job.department] || 'badge-default'

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        animation: 'fadeInUp 0.4s ease forwards',
      }}
    >
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px', lineHeight: 1.3 }}>
          {job.title}
        </h3>
        <span className={`badge ${badgeClass}`}>{job.department}</span>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {job.location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          {job.type}
        </span>
      </div>

      <p style={{
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        flex: 1,
      }}>
        {job.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
        {job.requirements.slice(0, 3).map((req, i) => (
          <span key={i} className="tag">{req.split(' ').slice(0, 4).join(' ')}{req.split(' ').length > 4 ? '…' : ''}</span>
        ))}
        {job.requirements.length > 3 && (
          <span className="tag">+{job.requirements.length - 3} more</span>
        )}
      </div>

      <button className="btn-primary" onClick={() => onApply(job)} style={{ alignSelf: 'flex-start' }}>
        Apply Now
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  )
}

export default function CareerPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeJob, setActiveJob] = useState(null)

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        position: 'relative',
        padding: '80px 0 60px',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Ambient gradient background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(139,133,255,0.06) 40%, rgba(10,10,15,0) 70%)',
          backgroundSize: '300% 300%',
          animation: 'ambientFlow 8s ease infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '300px',
          background: 'radial-gradient(ellipse at center, rgba(108,99,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(108,99,255,0.1)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-accent-light)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '24px',
            animation: 'fadeInUp 0.5s ease forwards',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', animation: 'pulse 2s ease infinite' }} />
            We're Hiring
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            animation: 'fadeInUp 0.5s 0.1s ease both',
          }}>
            Build the Future<br />
            <span style={{ color: 'var(--color-accent-light)' }}>With Us</span>
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--color-text-secondary)',
            maxWidth: '500px',
            margin: '0 auto',
            lineHeight: 1.7,
            animation: 'fadeInUp 0.5s 0.2s ease both',
          }}>
            Join a team that ships fast, thinks deeply, and cares about craft.
            Our AI-powered hiring process makes applying effortless.
          </p>
        </div>
      </section>

      {/* Job Grid */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container">
          {error && (
            <div style={{
              padding: '16px 20px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: '#f87171',
              marginBottom: '32px',
              fontSize: '14px',
            }}>
              Could not load jobs: {error}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
              : jobs.map((job) => (
                  <JobCard key={job.id} job={job} onApply={setActiveJob} />
                ))
            }
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      {activeJob && (
        <ChatWidget job={activeJob} onClose={() => setActiveJob(null)} />
      )}
    </div>
  )
}

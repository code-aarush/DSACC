import React from 'react'
import { useApp } from '../../context/useApp'
import { calculateExamCountdown, formatDateHuman } from '../../lib/date/dateUtils'

export const OverviewSection: React.FC = () => {
  const { appState, saveStatus, setActiveSection } = useApp()
  const settings = appState?.data.settings
  const examDate = settings?.examDate || '2026-11-03'
  const countdown = calculateExamCountdown(examDate)

  return (
    <div className="overview-container" role="region" aria-labelledby="overview-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="overview-title" className="section-title">Command Centre Overview</h2>
            <p className="section-subtitle">
              Local-first academic preparation environment for {settings?.examTitle || 'DSA End-Semester Examination'}
            </p>
          </div>
          <span className="badge badge-accent">Milestone 1: Active</span>
        </div>
      </div>

      {/* Intro Workspace Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="card-title">Preparation Command Centre &bull; Architecture Status</h3>
        <p className="card-description">
          Welcome to your local-first DSA preparation workspace. Milestone 1 establishes the verified
          architectural foundation: strict domain models, serialized and validated local persistence,
          schema migration infrastructure, and a responsive shell. Full academic records (Syllabus
          Units 1–3, 24 ADTs, and 25+ Algorithms) are strictly scheduled for population in Milestone 2.
        </p>
      </div>

      {/* Verified Status Cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Timeline</div>
          <h4 className="card-title">{countdown.formattedLabel}</h4>
          <p className="card-description">
            Configured target: <strong>{formatDateHuman(examDate)}</strong>. Countdown reflects system clock boundaries
            accurately without artificial metrics.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Storage Boundary</div>
          <h4 className="card-title">Schema Version {appState?.schemaVersion ?? 1}</h4>
          <p className="card-description">
            Storage status: <strong>{saveStatus}</strong>. Backed by typed LocalStorage with serialized write queues
            and pre-commit validation.
          </p>
        </div>

        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Academic Datasets</div>
          <h4 className="card-title">Staged for Milestone 2</h4>
          <p className="card-description">
            Contract interfaces for Topics, ADTs, Algorithms, CP Problems, and Tasks are implemented and validated.
          </p>
        </div>
      </div>

      {/* Roadmap & Quick Navigation */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="card-title">Execution Roadmap &amp; Milestone Gates</h3>
        <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ borderLeft: '3px solid var(--color-success-dot)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 1: Foundation &amp; Architecture</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Project initialization, strict TypeScript, design tokens, typed storage boundary, unit tests, responsive shell.
              <span className="badge badge-accent" style={{ display: 'inline-block', marginLeft: '6px' }}>Ready</span>
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 2: Academic Data &amp; Libraries</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Complete syllabus seed (Units 1–3), 24 ADT implementation records, 25+ algorithms, completion requirements.
            </p>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="badge badge-neutral"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSection('syllabus')}
              >
                Inspect Syllabus Contract &rarr;
              </button>
              <button
                type="button"
                className="badge badge-neutral"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveSection('adt-library')}
              >
                Inspect ADT Contract &rarr;
              </button>
            </div>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 3: Daily Study Workflows</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Task management, daily study planner, CP practice problem tracker, instant brain dump &amp; doubt capture.
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 4: Revision Intelligence &amp; Recovery</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Confidence ratings, weak-topic identification, spaced revision scheduling, JSON export, merge &amp; replace recovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

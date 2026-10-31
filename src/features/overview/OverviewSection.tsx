import React, { useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { calculateExamCountdown, formatDateHuman } from '../../lib/date/dateUtils'
import {
  calculateSyllabusProgress,
  calculateADTProgress,
  calculateAlgorithmProgress,
} from '../../lib/progress/progressCalculators'

export const OverviewSection: React.FC = () => {
  const { appState, saveStatus, setActiveSection } = useApp()
  const settings = appState?.data.settings
  const examDate = settings?.examDate || '2026-11-03'
  const countdown = calculateExamCountdown(examDate)

  const syllabusProgress = useMemo(
    () => calculateSyllabusProgress(appState?.data.topics || []),
    [appState?.data.topics]
  )
  const adtProgress = useMemo(
    () => calculateADTProgress(appState?.data.adts || []),
    [appState?.data.adts]
  )
  const algoProgress = useMemo(
    () => calculateAlgorithmProgress(appState?.data.algorithms || []),
    [appState?.data.algorithms]
  )

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
          <span className="badge badge-accent">Milestone 2: Academic Data</span>
        </div>
      </div>

      {/* Intro Workspace Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="card-title">Preparation Command Centre &bull; Live Academic Datasets</h3>
        <p className="card-description">
          Welcome to your local-first DSA preparation workspace. Milestone 2 establishes the verified
          academic core: 70 required syllabus topics across Units I–III (+ 2 optional extensions), 32 Abstract
          Data Types and representations with structured operation checklists, and 29 verified algorithms with
          complexity bounds and critical preconditions.
        </p>
      </div>

      {/* Verified Status Cards */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Exam Timeline</div>
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
          <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Required Syllabus Coverage</div>
          <h4 className="card-title">{syllabusProgress.percentageRequired}% Complete</h4>
          <p className="card-description">
            {syllabusProgress.completedRequired} of {syllabusProgress.totalRequired} required topics completed
            (strictly excludes optional topics).
          </p>
        </div>
      </div>

      {/* Academic Inventories Summary */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">ADT Library Inventory</h4>
            <span className="badge badge-neutral">{adtProgress.total} ADTs</span>
          </div>
          <p className="card-description" style={{ margin: 'var(--space-2) 0' }}>
            {adtProgress.tested + adtProgress.mastered} tested or mastered ({adtProgress.percentageTestedOrMastered}%).
            Checking operation checklists never auto-promotes to tested.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveSection('adt-library')}
          >
            Open ADT Library &rarr;
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">Algorithm Inventory</h4>
            <span className="badge badge-neutral">{algoProgress.totalRequired} Core Algorithms</span>
          </div>
          <p className="card-description" style={{ margin: 'var(--space-2) 0' }}>
            {algoProgress.correctnessTestedRequired} correctness-tested ({algoProgress.percentageTested}%).
            Preconditions (such as non-negative weights for Dijkstra) strictly documented.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveSection('algorithm-library')}
          >
            Open Algorithm Inventory &rarr;
          </button>
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
              <span className="badge badge-success" style={{ display: 'inline-block', marginLeft: '6px' }}>Verified</span>
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 2: Academic Data &amp; Libraries</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Complete syllabus seed (Units 1–3), 32 ADT implementation records, 29 algorithms, completion requirements.
              <span className="badge badge-accent" style={{ display: 'inline-block', marginLeft: '6px' }}>Active</span>
            </p>
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

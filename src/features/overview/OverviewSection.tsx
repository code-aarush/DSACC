import React, { useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { calculateExamCountdown, formatDateHuman, isTaskOverdue, isTaskDueToday } from '../../lib/date/dateUtils'
import {
  calculateSyllabusProgress,
  calculateADTProgress,
  calculateAlgorithmProgress,
} from '../../lib/progress/progressCalculators'
import {
  getTaskStats,
  getNextActionableTask,
  calculateCPProgress,
  getWeakTopics,
  getBrainDumpStats,
} from '../../lib/progress/taskAndCpCalculators'
import { getCurrentIsoTimestamp } from '../../lib/date/dateUtils'
import { calculateRevisionAnalytics, identifyWeakAreas } from '../../lib/revision/weakAreaAnalytics'

export const OverviewSection: React.FC = () => {
  const { appState, saveStatus, setActiveSection, updateAppState } = useApp()
  const settings = appState?.data.settings
  const examDate = settings?.examDate || '2026-11-03'
  const countdown = calculateExamCountdown(examDate)

  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])
  const tasks = useMemo(() => appState?.data.tasks || [], [appState?.data.tasks])
  const cpProblems = useMemo(() => appState?.data.cpProblems || [], [appState?.data.cpProblems])
  const notes = useMemo(() => appState?.data.brainDumpNotes || [], [appState?.data.brainDumpNotes])
  const revisions = useMemo(() => appState?.data.revisions || [], [appState?.data.revisions])

  // Academic dataset metrics
  const syllabusProgress = useMemo(() => calculateSyllabusProgress(topics), [topics])
  const adtProgress = useMemo(() => calculateADTProgress(adts), [adts])
  const algoProgress = useMemo(() => calculateAlgorithmProgress(algorithms), [algorithms])

  // Task & CP metrics
  const taskStats = useMemo(() => getTaskStats(tasks), [tasks])
  const nextTask = useMemo(() => getNextActionableTask(tasks), [tasks])
  const cpStats = useMemo(() => calculateCPProgress(cpProblems), [cpProblems])
  const weakTopics = useMemo(() => getWeakTopics(topics), [topics])
  const brainDumpStats = useMemo(() => getBrainDumpStats(notes), [notes])
  const unresolvedDoubts = useMemo(
    () => notes.filter(n => n.type === 'DOUBT' && !n.isResolved).slice(0, 5),
    [notes]
  )

  // Revision & Weak-Area intelligence
  const revisionAnalytics = useMemo(
    () => calculateRevisionAnalytics(revisions, topics),
    [revisions, topics]
  )
  const weakAreas = useMemo(
    () => identifyWeakAreas(topics, adts, algorithms, cpProblems, notes, revisions),
    [topics, adts, algorithms, cpProblems, notes, revisions]
  )

  const nextRevision = useMemo(() => {
    if (revisions.length === 0) return null
    return [...revisions].sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))[0]
  }, [revisions])

  // 1-click complete next actionable task
  const handleCompleteNextTask = async (taskId: string) => {
    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        tasks: prev.data.tasks.map(t =>
          t.id === taskId ? { ...t, status: 'DONE', updatedAt: now } : t
        ),
      },
    }))
  }

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
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span className="badge badge-neutral">Storage: {saveStatus}</span>
            <span className="badge badge-accent">Milestone 5: Production Ready</span>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if any overdue tasks or revisions */}
      {(taskStats.overdue > 0 || revisionAnalytics.overdue > 0) && (
        <div className="alert-banner warning" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <strong>Attention:</strong>{' '}
            {taskStats.overdue > 0 && <span>You have {taskStats.overdue} overdue task{taskStats.overdue > 1 ? 's' : ''}. </span>}
            {revisionAnalytics.overdue > 0 && <span>You have {revisionAnalytics.overdue} overdue spaced revision{revisionAnalytics.overdue > 1 ? 's' : ''}.</span>}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
            {taskStats.overdue > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveSection('tasks')}
              >
                Review Tasks &rarr;
              </button>
            )}
            {revisionAnalytics.overdue > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveSection('analytics')}
              >
                Review Revisions &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Next Actionable Task & Next Revision Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
        {/* Next Actionable Task Hero Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: 'var(--space-2)' }}>
                Next Study Task
              </span>
              {nextTask ? (
                <>
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    {nextTask.title}
                  </h3>
                  <p className="card-description" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {nextTask.description || 'Focus on completing this prioritized study item.'}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral">Category: {nextTask.category}</span>
                    <span className="badge badge-neutral">Priority: {nextTask.priority}</span>
                    {nextTask.dueDate && (
                      <span className="badge badge-neutral">Due: {formatDateHuman(nextTask.dueDate)}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    All scheduled tasks are completed!
                  </h3>
                  <p className="card-description" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Add a new task or study goal to your plan to keep your momentum going.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {nextTask && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCompleteNextTask(nextTask.id)}
                >
                  ✓ Mark Done
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveSection('tasks')}
              >
                Study Plan &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Prioritized Spaced Revision Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: 'var(--space-2)' }}>
                Prioritized Spaced Revision
              </span>
              {nextRevision ? (
                <>
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    {nextRevision.entityTitleSnapshot || nextRevision.entityId}
                  </h3>
                  <p className="card-description" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Spaced repetition interval: <strong>{nextRevision.currentIntervalDays}d</strong> &bull; Target:{' '}
                    <strong>{formatDateHuman(nextRevision.nextReviewDate)}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral">Type: {nextRevision.entityType}</span>
                    <span
                      className="badge badge-neutral"
                      style={isTaskOverdue(nextRevision.nextReviewDate) ? { color: 'var(--color-danger-text)' } : isTaskDueToday(nextRevision.nextReviewDate) ? { color: 'var(--color-accent)' } : {}}
                    >
                      {isTaskOverdue(nextRevision.nextReviewDate) ? 'Overdue' : isTaskDueToday(nextRevision.nextReviewDate) ? 'Due Today' : 'Upcoming'}
                    </span>
                    <span className="badge badge-neutral">{nextRevision.reviewHistory.length} past reviews</span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="card-title" style={{ fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    No Spaced Revisions Scheduled
                  </h3>
                  <p className="card-description" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Schedule syllabus topics or ADTs for active recall in the Revision Planner.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('analytics')}
            >
              Planner &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Exam Timeline</div>
            <h4 className="card-title">{countdown.formattedLabel}</h4>
            <p className="card-description">
              Target: <strong>{formatDateHuman(examDate)}</strong>. System clock aware boundaries without UTC day shifts.
            </p>
          </div>

          <div className="card">
            <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Study Plan Status</div>
            <h4 className="card-title">{taskStats.dueToday} Today &bull; {taskStats.dailyFocus} Focus</h4>
            <p className="card-description">
              {taskStats.done} completed of {taskStats.total} tasks. {taskStats.upcoming} upcoming.
            </p>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Spaced Repetition</div>
            <h4 className="card-title">{revisionAnalytics.dueToday} Due Today &bull; {revisionAnalytics.overdue} Overdue</h4>
            <p className="card-description">
              {revisionAnalytics.totalScheduled} scheduled &bull; {revisionAnalytics.totalCompletedReviews} reviews ({revisionAnalytics.onTimeCompletionRate}% on-time).
            </p>
          </div>

          <div className="card">
            <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>CP Practice Solves</div>
            <h4 className="card-title">{cpStats.independentlySolved} Independent &bull; {cpStats.assistedSolved} Assisted</h4>
            <p className="card-description">
              {cpStats.total} total problems logged. {cpStats.needsReattempt} flagged for reattempt.
            </p>
          </div>
        </div>
      </div>

      {/* Academic Coverage & Doubt Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
        {/* Academic Progress */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">Academic Syllabus &amp; Libraries</h4>
            <span className="badge badge-neutral">{syllabusProgress.percentageRequired}% Syllabus</span>
          </div>
          <p className="card-description" style={{ margin: 'var(--space-2) 0' }}>
            &bull; <strong>{syllabusProgress.completedRequired}/{syllabusProgress.totalRequired}</strong> required topics completed (excluding optional).<br />
            &bull; <strong>{adtProgress.tested + adtProgress.mastered}/{adtProgress.total}</strong> ADTs tested or mastered ({adtProgress.percentageTestedOrMastered}%).<br />
            &bull; <strong>{algoProgress.correctnessTestedRequired}/{algoProgress.totalRequired}</strong> algorithms correctness-tested ({algoProgress.percentageTested}%).
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('syllabus')}
            >
              Syllabus &rarr;
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('adt-library')}
            >
              ADTs &rarr;
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('algorithm-library')}
            >
              Algorithms &rarr;
            </button>
          </div>
        </div>

        {/* Doubts & Mistakes */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">Brain Dump &amp; Doubt Status</h4>
            <span className="badge badge-warning">{brainDumpStats.unresolvedDoubts} Unresolved</span>
          </div>
          <p className="card-description" style={{ margin: 'var(--space-2) 0' }}>
            &bull; <strong>{brainDumpStats.doubts}</strong> questions &amp; doubts logged ({brainDumpStats.unresolvedDoubts} active).<br />
            &bull; <strong>{brainDumpStats.mistakes}</strong> documented traps and mistakes.<br />
            &bull; <strong>{brainDumpStats.pinned}</strong> pinned items for immediate recall.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('brain-dump')}
            >
              Open Brain Dump &rarr;
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('cp-practice')}
            >
              Open CP Practice &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Weak Topics & Active Doubts Section */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Weak Topics & Flagged Areas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h4 className="card-title" style={{ margin: 0 }}>Weak Topics (Confidence 1–2)</h4>
            <span className="badge badge-neutral">{weakTopics.length} Topics</span>
          </div>
          {weakTopics.length === 0 ? (
            <p className="card-description">
              No low-confidence topics found! All topics rated confidence 3 or higher.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {weakTopics.slice(0, 5).map(topic => (
                <div
                  key={topic.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  <div>
                    <strong>[{topic.unit}]</strong> {topic.title}
                  </div>
                  <span className="badge badge-warning">
                    Confidence {topic.confidence}/5
                  </span>
                </div>
              ))}
              {weakTopics.length > 5 && (
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  + {weakTopics.length - 5} more weak topics in Syllabus.
                </span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('syllabus')}
            >
              Review in Syllabus &rarr;
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveSection('analytics')}
            >
              Weak-Area Analytics ({weakAreas.length}) &rarr;
            </button>
          </div>
        </div>

        {/* Unresolved Doubts List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h4 className="card-title" style={{ margin: 0 }}>Unresolved Doubts &amp; Traps</h4>
            <span className="badge badge-warning">{unresolvedDoubts.length} Doubts</span>
          </div>
          {unresolvedDoubts.length === 0 ? (
            <p className="card-description">
              No unresolved doubts! Clear understanding maintained.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {unresolvedDoubts.map(doubt => (
                <div
                  key={doubt.id}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                    {doubt.title || doubt.body.slice(0, 60)}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    Logged {formatDateHuman(doubt.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={() => setActiveSection('brain-dump')}
          >
            Manage Doubts in Brain Dump &rarr;
          </button>
        </div>
      </div>

      {/* Roadmap & Milestone Gates */}
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

          <div style={{ borderLeft: '3px solid var(--color-success-dot)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 2: Academic Data &amp; Libraries</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Complete syllabus seed (Units 1–3), 32 ADT implementation records, 29 algorithms, completion requirements.
              <span className="badge badge-success" style={{ display: 'inline-block', marginLeft: '6px' }}>Verified</span>
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-success-dot)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 3: Daily Study Workflows</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Task management, daily study planner, CP practice problem tracker, instant brain dump &amp; doubt capture.
              <span className="badge badge-success" style={{ display: 'inline-block', marginLeft: '6px' }}>Verified</span>
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-success-dot)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 4: Revision Intelligence &amp; Recovery</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Spaced revision scheduling, weak-area analytics, JSON export/restore workflows, and safety backups.
              <span className="badge badge-success" style={{ display: 'inline-block', marginLeft: '6px' }}>Verified</span>
            </p>
          </div>

          <div style={{ borderLeft: '3px solid var(--color-success-dot)', paddingLeft: 'var(--space-3)' }}>
            <strong>Milestone 5: QA, Hardening &amp; Release</strong>
            <p className="card-description" style={{ marginTop: '4px' }}>
              Comprehensive regression verification, backup safety audit, responsive hardening, accessibility, and documentation.
              <span className="badge badge-success" style={{ display: 'inline-block', marginLeft: '6px' }}>Verified</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

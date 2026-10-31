import React, { useState, useMemo, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import {
  RevisionRecord,
  ReviewOutcome,
  TopicConfidenceLevel,
  RevisionEntityType,
  SyllabusUnit,
  VersionedApplicationState,
} from '../../types/domain'
import {
  formatDateHuman,
  getCurrentIsoTimestamp,
  isTaskOverdue,
  isTaskDueToday,
  isTaskUpcoming,
} from '../../lib/date/dateUtils'
import {
  calculateNextReview,
  recordReviewEvent,
  rescheduleRevision,
  revertLastReviewEvent,
  createRevisionRecord,
  getTodayDateString,
} from '../../lib/revision/scheduler'
import {
  identifyWeakAreas,
  calculateRevisionAnalytics,
} from '../../lib/revision/weakAreaAnalytics'
import {
  createBackupEnvelope,
  triggerBackupDownload,
  validateBackupFile,
  mergeBackupData,
  createSafetyBackupSnapshot,
  loadSafetyBackupSnapshot,
  getBackupStatus,
  BackupValidationResult,
  MergeReportSummary,
} from '../../lib/backup/backupService'

type ActiveTab = 'PLANNER' | 'WEAK_AREAS' | 'BACKUP_RECOVERY'
type PlannerFilterView = 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'ALL'

const OUTCOME_LABELS: Record<ReviewOutcome, string> = {
  FAILED: 'Failed / Forgotten',
  WEAK: 'Weak / Hesitant',
  SATISFACTORY: 'Satisfactory / Good',
  STRONG: 'Strong / Effortless',
}

export const RevisionAnalyticsSection: React.FC = () => {
  const { appState, updateAppState, setActiveSection } = useApp()

  const topics = useMemo(() => appState?.data.topics || [], [appState?.data.topics])
  const adts = useMemo(() => appState?.data.adts || [], [appState?.data.adts])
  const algorithms = useMemo(() => appState?.data.algorithms || [], [appState?.data.algorithms])
  const cpProblems = useMemo(() => appState?.data.cpProblems || [], [appState?.data.cpProblems])
  const notes = useMemo(() => appState?.data.brainDumpNotes || [], [appState?.data.brainDumpNotes])
  const revisions = useMemo(() => appState?.data.revisions || [], [appState?.data.revisions])
  const settings = appState?.data.settings

  // Global Section Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('PLANNER')

  // Entity Lookups
  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics])
  const adtMap = useMemo(() => new Map(adts.map(a => [a.id, a])), [adts])
  const algoMap = useMemo(() => new Map(algorithms.map(a => [a.id, a])), [algorithms])
  const cpMap = useMemo(() => new Map(cpProblems.map(c => [c.id, c])), [cpProblems])

  // Helper to resolve entity title or detect stale reference
  const getEntityInfo = useCallback((rev: RevisionRecord): { title: string; isStale: boolean; unit?: SyllabusUnit } => {
    switch (rev.entityType) {
      case 'TOPIC': {
        const t = topicMap.get(rev.entityId)
        return t
          ? { title: t.title, isStale: false, unit: t.unit }
          : { title: rev.entityTitleSnapshot || `Deleted Topic (${rev.entityId})`, isStale: true }
      }
      case 'ADT': {
        const a = adtMap.get(rev.entityId)
        return a
          ? { title: a.name, isStale: false }
          : { title: rev.entityTitleSnapshot || `Deleted ADT (${rev.entityId})`, isStale: true }
      }
      case 'ALGORITHM': {
        const al = algoMap.get(rev.entityId)
        return al
          ? { title: al.name, isStale: false }
          : { title: rev.entityTitleSnapshot || `Deleted Algorithm (${rev.entityId})`, isStale: true }
      }
      case 'CP_PROBLEM': {
        const cp = cpMap.get(rev.entityId)
        return cp
          ? { title: `[${cp.platform}] ${cp.title}`, isStale: false }
          : { title: rev.entityTitleSnapshot || `Deleted CP Problem (${rev.entityId})`, isStale: true }
      }
    }
  }, [topicMap, adtMap, algoMap, cpMap])

  // Analytics & Weak areas derivations
  const analytics = useMemo(
    () => calculateRevisionAnalytics(revisions, topics),
    [revisions, topics]
  )
  const weakAreas = useMemo(
    () => identifyWeakAreas(topics, adts, algorithms, cpProblems, notes, revisions),
    [topics, adts, algorithms, cpProblems, notes, revisions]
  )
  const backupStatus = useMemo(
    () => (settings ? getBackupStatus(settings) : null),
    [settings]
  )
  const [safetySnapshot, setSafetySnapshot] = useState<VersionedApplicationState | null>(() => loadSafetyBackupSnapshot())

  // --------------------------------------------------------------------------
  // Tab 1: Planner States & Handlers
  // --------------------------------------------------------------------------
  const [plannerFilter, setPlannerFilter] = useState<PlannerFilterView>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterUnit, setFilterUnit] = useState<string>('ALL')
  const [plannerSearch, setPlannerSearch] = useState('')

  // Review Modal State
  const [reviewingRev, setReviewingRev] = useState<RevisionRecord | null>(null)
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('SATISFACTORY')
  const [reviewConfidence, setReviewConfidence] = useState<TopicConfidenceLevel>(3)
  const [reviewNotes, setReviewNotes] = useState('')
  const [customNextDate, setCustomNextDate] = useState('')

  // Reschedule Modal State
  const [reschedulingRev, setReschedulingRev] = useState<RevisionRecord | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  // Quick-Add Revision State
  const [quickAddEntityType, setQuickAddEntityType] = useState<RevisionEntityType>('TOPIC')
  const [quickAddEntityId, setQuickAddEntityId] = useState('')
  const [quickAddDueDate, setQuickAddDueDate] = useState('')

  const filteredRevisions = useMemo(() => {
    return revisions.filter(rev => {
      const info = getEntityInfo(rev)

      // 1. Planner View Filter
      if (plannerFilter === 'DUE_TODAY') {
        if (!isTaskDueToday(rev.nextReviewDate)) return false
      } else if (plannerFilter === 'OVERDUE') {
        if (!isTaskOverdue(rev.nextReviewDate)) return false
      } else if (plannerFilter === 'UPCOMING') {
        if (!isTaskUpcoming(rev.nextReviewDate)) return false
      }

      // 2. Entity Type Filter
      if (filterType !== 'ALL' && rev.entityType !== filterType) return false

      // 3. Unit Filter
      if (filterUnit !== 'ALL' && info.unit !== filterUnit) return false

      // 4. Search Filter
      if (plannerSearch.trim()) {
        const q = plannerSearch.toLowerCase()
        const matchesTitle = info.title.toLowerCase().includes(q)
        const matchesNotes = (rev.notes || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesNotes) return false
      }

      return true
    }).sort((a, b) => {
      // Sort by next review date earliest first
      return a.nextReviewDate.localeCompare(b.nextReviewDate)
    })
  }, [revisions, plannerFilter, filterType, filterUnit, plannerSearch, getEntityInfo])

  // Quick Add Revision handler
  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddEntityId) return

    let titleSnapshot = ''
    if (quickAddEntityType === 'TOPIC') titleSnapshot = topicMap.get(quickAddEntityId)?.title || ''
    else if (quickAddEntityType === 'ADT') titleSnapshot = adtMap.get(quickAddEntityId)?.name || ''
    else if (quickAddEntityType === 'ALGORITHM') titleSnapshot = algoMap.get(quickAddEntityId)?.name || ''
    else if (quickAddEntityType === 'CP_PROBLEM') titleSnapshot = cpMap.get(quickAddEntityId)?.title || ''

    const intervals = settings?.spacedRepetitionIntervalsDays || [1, 3, 7, 14, 30]
    const initialDue = quickAddDueDate || getTodayDateString()
    const newRev = createRevisionRecord(quickAddEntityType, quickAddEntityId, titleSnapshot, initialDue, intervals)

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        revisions: [newRev, ...prev.data.revisions],
      },
    }))

    setQuickAddEntityId('')
    setQuickAddDueDate('')
  }

  // Record Review Submit
  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewingRev) return

    const intervals = settings?.spacedRepetitionIntervalsDays || [1, 3, 7, 14, 30]
    const currentConf = reviewingRev.entityType === 'TOPIC'
      ? topicMap.get(reviewingRev.entityId)?.confidence
      : undefined

    const updatedRev = recordReviewEvent(
      reviewingRev,
      reviewOutcome,
      reviewConfidence,
      currentConf,
      reviewNotes,
      customNextDate || undefined,
      intervals
    )

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => {
      // 1. Update revision record
      const nextRevisions = prev.data.revisions.map(r => (r.id === updatedRev.id ? updatedRev : r))

      // 2. If it's a syllabus topic, update confidence and revision timestamps
      let nextTopics = prev.data.topics
      if (reviewingRev.entityType === 'TOPIC') {
        nextTopics = prev.data.topics.map(t => {
          if (t.id !== reviewingRev.entityId) return t
          return {
            ...t,
            confidence: reviewConfidence,
            lastRevisedAt: now,
            nextRevisionDueDate: updatedRev.nextReviewDate,
            revisionStatus: updatedRev.revisionStatus,
            updatedAt: now,
          }
        })
      }

      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          revisions: nextRevisions,
          topics: nextTopics,
        },
      }
    })

    setReviewingRev(null)
    setReviewNotes('')
    setCustomNextDate('')
  }

  // Reschedule Submit
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reschedulingRev || !rescheduleDate) return

    const updatedRev = rescheduleRevision(reschedulingRev, rescheduleDate)
    const now = getCurrentIsoTimestamp()

    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        revisions: prev.data.revisions.map(r => (r.id === updatedRev.id ? updatedRev : r)),
      },
    }))

    setReschedulingRev(null)
    setRescheduleDate('')
  }

  // Void / Revert Last Review Event
  // Reversible: Undoing a review recalculates upcoming/due/overdue status and updates recall analytics.
  const handleVoidLastReview = async (revId: string) => {
    const targetRev = revisions.find(r => r.id === revId)
    if (!targetRev || targetRev.reviewHistory.length === 0) return
    const confirmed = window.confirm(
      `Revert the last recorded review for "${getEntityInfo(targetRev).title}"? This will restore the schedule to before that review.`
    )
    if (!confirmed) return

    const intervals = settings?.spacedRepetitionIntervalsDays || [1, 3, 7, 14, 30]
    const updatedRev = revertLastReviewEvent(targetRev, intervals)
    const now = getCurrentIsoTimestamp()

    await updateAppState(prev => {
      const nextRevisions = prev.data.revisions.map(r => (r.id === updatedRev.id ? updatedRev : r))

      // If syllabus topic, restore confidence if previous log exists
      let nextTopics = prev.data.topics
      if (targetRev.entityType === 'TOPIC') {
        const lastRemainingLog = updatedRev.reviewHistory[updatedRev.reviewHistory.length - 1]
        nextTopics = prev.data.topics.map(t => {
          if (t.id !== targetRev.entityId) return t
          return {
            ...t,
            confidence: lastRemainingLog ? lastRemainingLog.confidenceAfter : t.confidence,
            lastRevisedAt: lastRemainingLog ? lastRemainingLog.reviewedAt : undefined,
            nextRevisionDueDate: updatedRev.nextReviewDate,
            revisionStatus: updatedRev.revisionStatus,
            updatedAt: now,
          }
        })
      }

      return {
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          revisions: nextRevisions,
          topics: nextTopics,
        },
      }
    })
  }

  // Delete Revision Record
  const handleDeleteRevision = async (revId: string) => {
    const confirmed = window.confirm('Are you sure you want to remove this revision schedule?')
    if (!confirmed) return

    const now = getCurrentIsoTimestamp()
    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        revisions: prev.data.revisions.filter(r => r.id !== revId),
      },
    }))
  }

  // --------------------------------------------------------------------------
  // Tab 3: Backup & Restore States & Handlers
  // --------------------------------------------------------------------------
  const [backupNotice, setBackupNotice] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<BackupValidationResult | null>(null)
  const [mergeReport, setMergeReport] = useState<MergeReportSummary | null>(null)
  const [replaceConfirmWord, setReplaceConfirmWord] = useState('')
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)

  // Handle Export Backup
  const handleExportBackup = async () => {
    if (!appState) return
    const envelope = createBackupEnvelope(appState)
    const success = triggerBackupDownload(envelope)

    if (success) {
      const now = envelope.exportedAt
      await updateAppState(prev => ({
        ...prev,
        updatedAt: now,
        data: {
          ...prev.data,
          settings: {
            ...prev.data.settings,
            lastExportedAt: now,
          },
        },
      }))
      setBackupNotice('Backup exported successfully! File downloaded to your device.')
      setTimeout(() => setBackupNotice(null), 5000)
    } else {
      setBackupNotice('Error: Could not trigger file download. Please check browser permissions.')
    }
  }

  // Snooze Reminder
  const handleSnoozeBackupReminder = async () => {
    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + 7)
    const now = getCurrentIsoTimestamp()

    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: {
        ...prev.data,
        settings: {
          ...prev.data.settings,
          backupReminderDismissedUntil: snoozeDate.toISOString(),
        },
      },
    }))
  }

  // Handle File Selection for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const content = event.target?.result as string
      if (content && appState) {
        const validation = validateBackupFile(content, appState)
        setImportResult(validation)
        setMergeReport(null)
      }
    }
    reader.readAsText(file)
  }

  // Execute Merge
  const handleExecuteMerge = async () => {
    if (!appState || !importResult?.envelope) return

    const { mergedData, report } = mergeBackupData(appState.data, importResult.envelope.data)
    const now = getCurrentIsoTimestamp()

    await updateAppState(prev => ({
      ...prev,
      updatedAt: now,
      data: mergedData,
    }))

    setMergeReport(report)
    setImportResult(null)
    setBackupNotice('Data merged successfully! All non-conflicting records and newer edits were integrated.')
    setTimeout(() => setBackupNotice(null), 6000)
  }

  // Execute Replace
  const handleExecuteReplace = async () => {
    if (!appState || !importResult?.envelope) return
    if (replaceConfirmWord !== 'RESTORE') {
      alert('Please type RESTORE to confirm replacement.')
      return
    }

    // Step 1: Create emergency safety backup
    const backupCreated = createSafetyBackupSnapshot(appState)
    if (!backupCreated) {
      alert('Could not create emergency safety backup snapshot. Restore aborted to protect existing data.')
      return
    }

    // Step 2: Commit replace
    const incoming = importResult.envelope
    const now = getCurrentIsoTimestamp()
    const success = await updateAppState(
      () => ({
        schemaVersion: incoming.schemaVersion,
        appVersion: incoming.appVersion,
        updatedAt: now,
        data: incoming.data,
      }),
      { force: true }
    )

    setIsReplaceModalOpen(false)
    setReplaceConfirmWord('')
    setImportResult(null)

    if (success) {
      setSafetySnapshot(loadSafetyBackupSnapshot())
      setBackupNotice('Full restore completed! Live application state replaced from backup.')
    } else {
      setBackupNotice('Restore failed! Rolling back to pre-restore safety snapshot.')
      const rollbackState = loadSafetyBackupSnapshot()
      if (rollbackState) {
        await updateAppState(() => rollbackState, { force: true })
      }
    }
  }

  // Rollback to Emergency Safety Snapshot
  const handleRollbackSafetySnapshot = async () => {
    if (!safetySnapshot) return
    const confirmed = window.confirm(
      'Roll back to the pre-restore emergency safety backup snapshot? This will restore your data to how it was before the previous restore.'
    )
    if (!confirmed) return

    const now = getCurrentIsoTimestamp()
    const success = await updateAppState(
      () => ({
        ...safetySnapshot,
        updatedAt: now,
      }),
      { force: true }
    )

    if (success) {
      setBackupNotice('Emergency rollback complete! State restored from pre-restore safety snapshot.')
    } else {
      setBackupNotice('Rollback failed. Storage write could not complete.')
    }
  }

  return (
    <div className="revision-analytics-container" role="region" aria-labelledby="rev-analytics-title">
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id="rev-analytics-title" className="section-title">Revision Intelligence &amp; Recovery</h2>
            <p className="section-subtitle">
              Spaced repetition scheduler, weak-area analytics, review history, validated JSON export/import and backup protection.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportBackup}
            >
              &darr; Export Backup
            </button>
          </div>
        </div>
      </div>

      {/* Global Status / Alert Notice */}
      {backupNotice && (
        <div className="alert-banner info" role="status" style={{ marginBottom: 'var(--space-4)' }}>
          {backupNotice}
        </div>
      )}

      {/* Backup Staleness Warning Banner */}
      {backupStatus && !backupStatus.isDismissed && backupStatus.status !== 'FRESH' && (
        <div
          className={`alert-banner ${backupStatus.status === 'STALE' ? 'warning' : 'info'}`}
          role="alert"
          style={{ marginBottom: 'var(--space-4)' }}
        >
          <div style={{ flex: 1 }}>
            <strong>Backup Notice:</strong> {backupStatus.message}
            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>
              Local browser storage is subject to accidental cache clears. Maintain an independent backup file.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleExportBackup}
            >
              Export Now
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSnoozeBackupReminder}
            >
              Snooze (7d)
            </button>
          </div>
        </div>
      )}

      {/* Main Section Navigation Tabs */}
      <div className="tab-group" role="tablist" aria-label="Revision and Analytics modules">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PLANNER'}
          className={`tab-btn ${activeTab === 'PLANNER' ? 'active' : ''}`}
          onClick={() => setActiveTab('PLANNER')}
        >
          Spaced Revision Planner
          <span className="tab-badge">{analytics.totalScheduled}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'WEAK_AREAS'}
          className={`tab-btn ${activeTab === 'WEAK_AREAS' ? 'active' : ''}`}
          onClick={() => setActiveTab('WEAK_AREAS')}
        >
          Weak Areas &amp; Analytics
          <span className="tab-badge">{weakAreas.length} Weak</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'BACKUP_RECOVERY'}
          className={`tab-btn ${activeTab === 'BACKUP_RECOVERY' ? 'active' : ''}`}
          onClick={() => setActiveTab('BACKUP_RECOVERY')}
        >
          Backup, Export &amp; Restore
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SPACED REVISION PLANNER                                       */}
      {/* ==================================================================== */}
      {activeTab === 'PLANNER' && (
        <div className="planner-tab">
          {/* Quick Metrics */}
          <div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card">
              <div className="badge badge-warning" style={{ marginBottom: 'var(--space-2)' }}>Overdue Items</div>
              <h4 className="card-title">{analytics.overdue} Overdue</h4>
              <p className="card-description">
                Scheduled reviews whose target date has passed. Immediate priority.
              </p>
            </div>
            <div className="card">
              <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>Due Today</div>
              <h4 className="card-title">{analytics.dueToday} Due Today</h4>
              <p className="card-description">
                Items scheduled for active recall and self-assessment today.
              </p>
            </div>
            <div className="card">
              <div className="badge badge-neutral" style={{ marginBottom: 'var(--space-2)' }}>On-Time Recall Rate</div>
              <h4 className="card-title">{analytics.onTimeCompletionRate}% On-Time</h4>
              <p className="card-description">
                Based on {analytics.totalCompletedReviews} completed reviews. High-performing recall retention.
              </p>
            </div>
          </div>

          {/* Quick Add Revision Schedule */}
          <form onSubmit={handleCreateRevision} className="quick-add-bar" aria-label="Schedule Revision Form">
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
              + Schedule Item:
            </span>
            <select
              className="form-select"
              value={quickAddEntityType}
              onChange={e => {
                setQuickAddEntityType(e.target.value as RevisionEntityType)
                setQuickAddEntityId('')
              }}
              aria-label="Select entity type to schedule"
            >
              <option value="TOPIC">Syllabus Topic</option>
              <option value="ADT">ADT</option>
              <option value="ALGORITHM">Algorithm</option>
              <option value="CP_PROBLEM">CP Problem</option>
            </select>

            <select
              className="form-select"
              value={quickAddEntityId}
              onChange={e => setQuickAddEntityId(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
              aria-label="Select item to schedule"
            >
              <option value="">-- Choose Item --</option>
              {quickAddEntityType === 'TOPIC' &&
                topics.map(t => (
                  <option key={t.id} value={t.id}>[{t.unit}] {t.title}</option>
                ))}
              {quickAddEntityType === 'ADT' &&
                adts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              {quickAddEntityType === 'ALGORITHM' &&
                algorithms.map(al => (
                  <option key={al.id} value={al.id}>{al.name}</option>
                ))}
              {quickAddEntityType === 'CP_PROBLEM' &&
                cpProblems.map(c => (
                  <option key={c.id} value={c.id}>[{c.platform}] {c.title}</option>
                ))}
            </select>

            <input
              type="date"
              className="form-input"
              value={quickAddDueDate}
              onChange={e => setQuickAddDueDate(e.target.value)}
              aria-label="Target revision date"
              title="Target revision date"
            />

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={!quickAddEntityId}
            >
              Schedule
            </button>
          </form>

          {/* Sub-Filters */}
          <div className="filter-bar">
            <div className="filter-group">
              <button
                type="button"
                className={`tab-btn ${plannerFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setPlannerFilter('ALL')}
              >
                All ({revisions.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${plannerFilter === 'OVERDUE' ? 'active' : ''}`}
                onClick={() => setPlannerFilter('OVERDUE')}
              >
                Overdue ({analytics.overdue})
              </button>
              <button
                type="button"
                className={`tab-btn ${plannerFilter === 'DUE_TODAY' ? 'active' : ''}`}
                onClick={() => setPlannerFilter('DUE_TODAY')}
              >
                Due Today ({analytics.dueToday})
              </button>
              <button
                type="button"
                className={`tab-btn ${plannerFilter === 'UPCOMING' ? 'active' : ''}`}
                onClick={() => setPlannerFilter('UPCOMING')}
              >
                Upcoming ({analytics.upcoming})
              </button>
            </div>

            <div className="filter-group">
              <input
                type="search"
                className="search-input"
                placeholder="Search revision items..."
                value={plannerSearch}
                onChange={e => setPlannerSearch(e.target.value)}
                aria-label="Search revision planner items"
              />
              <select
                className="filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                aria-label="Filter by entity type"
              >
                <option value="ALL">All Types</option>
                <option value="TOPIC">Topics</option>
                <option value="ADT">ADTs</option>
                <option value="ALGORITHM">Algorithms</option>
                <option value="CP_PROBLEM">CP Problems</option>
              </select>
              <select
                className="filter-select"
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                aria-label="Filter by unit"
              >
                <option value="ALL">All Units</option>
                <option value="UNIT_I">Unit I</option>
                <option value="UNIT_II">Unit II</option>
                <option value="UNIT_III">Unit III</option>
              </select>
            </div>
          </div>

          {/* Revision Items List */}
          <div className="revision-list" role="list" aria-label="Scheduled Revisions">
            {filteredRevisions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <p className="card-description">
                  No scheduled revisions found matching your current filter.
                </p>
              </div>
            ) : (
              filteredRevisions.map(rev => {
                const info = getEntityInfo(rev)
                const isOverdue = isTaskOverdue(rev.nextReviewDate)
                const isToday = isTaskDueToday(rev.nextReviewDate)

                return (
                  <div
                    key={rev.id}
                    className="task-card"
                    role="listitem"
                    style={isOverdue ? { borderLeft: '4px solid var(--color-danger-dot)' } : isToday ? { borderLeft: '4px solid var(--color-accent)' } : {}}
                  >
                    <div className="task-header">
                      <div className="task-title-area">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <span className="task-title">
                              {info.title}
                            </span>
                            <span className="badge badge-neutral">
                              {rev.entityType}
                            </span>
                            {info.unit && (
                              <span className="badge badge-neutral">
                                {info.unit}
                              </span>
                            )}
                            {info.isStale && (
                              <span className="badge badge-warning" title="Referenced entity was deleted">
                                Stale Reference
                              </span>
                            )}
                            <span
                              className="badge badge-neutral"
                              style={isOverdue ? { color: 'var(--color-danger-text)', borderColor: 'var(--color-danger-border)' } : isToday ? { color: 'var(--color-accent)' } : {}}
                            >
                              {isOverdue ? 'Overdue: ' : isToday ? 'Due Today: ' : 'Next: '}
                              {formatDateHuman(rev.nextReviewDate)}
                            </span>
                            <span className="badge badge-neutral">
                              Interval: {rev.currentIntervalDays}d
                            </span>
                            <span className="badge badge-neutral">
                              {rev.reviewHistory.length} {rev.reviewHistory.length === 1 ? 'review' : 'reviews'}
                            </span>
                          </div>

                          {/* Last Review Snippet */}
                          {rev.reviewHistory.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                              Last reviewed: {formatDateHuman(rev.reviewHistory[rev.reviewHistory.length - 1].reviewedAt)} &bull;{' '}
                              Outcome: <strong>{rev.reviewHistory[rev.reviewHistory.length - 1].outcome}</strong> &bull;{' '}
                              Confidence: {rev.reviewHistory[rev.reviewHistory.length - 1].confidenceAfter}/5
                              {rev.reviewHistory[rev.reviewHistory.length - 1].notes && (
                                <span> &bull; "{rev.reviewHistory[rev.reviewHistory.length - 1].notes}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setReviewingRev(rev)
                            setReviewOutcome('SATISFACTORY')
                            setReviewConfidence(3)
                            setReviewNotes('')
                            setCustomNextDate('')
                          }}
                        >
                          Record Review
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setReschedulingRev(rev)
                            setRescheduleDate(rev.nextReviewDate)
                          }}
                        >
                          Reschedule
                        </button>
                        {rev.reviewHistory.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleVoidLastReview(rev.id)}
                            title="Revert the last recorded review event"
                          >
                            ↩ Void Review
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteRevision(rev.id)}
                          aria-label={`Remove revision for ${info.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: WEAK AREAS & ANALYTICS                                        */}
      {/* ==================================================================== */}
      {activeTab === 'WEAK_AREAS' && (
        <div className="analytics-tab">
          {/* Weak Areas Banner */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <h3 className="card-title">Prioritized Weak Areas &amp; Trap Signals</h3>
              <span className="badge badge-warning">{weakAreas.length} Flagged</span>
            </div>
            <p className="card-description">
              Transparent, explainable signals derived from low self-reported confidence (1–2), overdue revision deadlines,
              unresolved Brain Dump doubts, and documented CP mistakes. Items without observations are never assumed to be weak.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {weakAreas.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No weak areas flagged! All topics rated confidence 3+ with no overdue reviews or unresolved mistakes.
                </div>
              ) : (
                weakAreas.map(item => (
                  <div
                    key={`${item.entityType}:${item.entityId}`}
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${item.severity === 'CRITICAL' ? 'var(--color-danger-dot)' : item.severity === 'HIGH' ? 'var(--color-warning-dot)' : 'var(--color-accent)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <strong>{item.title}</strong>
                          <span className="badge badge-neutral">{item.entityType}</span>
                          {item.unit && <span className="badge badge-neutral">{item.unit}</span>}
                          <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-warning' : 'badge-neutral'}`}>
                            {item.severity}
                          </span>
                        </div>
                        <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {item.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (item.entityType === 'TOPIC') setActiveSection('syllabus')
                          else if (item.entityType === 'CP_PROBLEM') setActiveSection('cp-practice')
                        }}
                      >
                        Open Entity &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Genuine Analytics Breakdown */}
          <div className="grid-2" style={{ marginBottom: 'var(--space-5)' }}>
            {/* Reviews by Unit */}
            <div className="card">
              <h4 className="card-title">Reviews by Academic Unit</h4>
              <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
                Completed spaced repetitions partitioned by curriculum units.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Unit I: Foundations &amp; Linear Structures</span>
                  <strong>{analytics.reviewsByUnit.UNIT_I} reviews</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Unit II: Trees &amp; Priority Queues</span>
                  <strong>{analytics.reviewsByUnit.UNIT_II} reviews</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Unit III: Search Trees, Maps &amp; Graphs</span>
                  <strong>{analytics.reviewsByUnit.UNIT_III} reviews</strong>
                </div>
              </div>
            </div>

            {/* Confidence Trends */}
            <div className="card">
              <h4 className="card-title">Confidence Trajectory</h4>
              <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
                Recorded transitions comparing confidence before vs after review events.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Confidence Improved (&uarr;)</span>
                  <span className="badge badge-accent">{analytics.confidenceChanges.improved} items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Confidence Maintained (=)</span>
                  <span className="badge badge-neutral">{analytics.confidenceChanges.maintained} items</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>Confidence Declined (&darr;)</span>
                  <span className="badge badge-warning">{analytics.confidenceChanges.declined} items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Review History Table */}
          <div className="card">
            <h4 className="card-title">Recent Review Event History</h4>
            <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
              Complete chronological audit trail of all recorded spaced reviews.
            </p>
            {analytics.recentHistory.length === 0 ? (
              <p className="card-description">No review events logged yet. Complete reviews in the planner to populate history.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-default)', textAlign: 'left', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      <th style={{ padding: '8px' }}>Date</th>
                      <th style={{ padding: '8px' }}>Entity</th>
                      <th style={{ padding: '8px' }}>Type</th>
                      <th style={{ padding: '8px' }}>Outcome</th>
                      <th style={{ padding: '8px' }}>Confidence</th>
                      <th style={{ padding: '8px' }}>New Interval</th>
                      <th style={{ padding: '8px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentHistory.slice(0, 15).map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{formatDateHuman(log.reviewedAt)}</td>
                        <td style={{ padding: '8px' }}><strong>{log.entityTitle}</strong></td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}><span className="badge badge-neutral">{log.entityType}</span></td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          <span className={`badge ${log.outcome === 'FAILED' ? 'badge-warning' : log.outcome === 'STRONG' ? 'badge-accent' : 'badge-neutral'}`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                          {log.confidenceBefore ? `${log.confidenceBefore} &rarr; ` : ''}
                          <strong>{log.confidenceAfter}/5</strong>
                        </td>
                        <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{log.intervalDays}d</td>
                        <td style={{ padding: '8px', color: 'var(--color-text-muted)' }}>{log.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: BACKUP, EXPORT & RESTORE                                      */}
      {/* ==================================================================== */}
      {activeTab === 'BACKUP_RECOVERY' && (
        <div className="backup-tab">
          {/* Export Card */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <h3 className="card-title">Download Independent JSON Backup</h3>
            <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
              Creates an encrypted/validated offline JSON export covering all 9 application stores: topics, ADTs, algorithms,
              CP practice records, study plan tasks, Brain Dump notes, study sessions, revision schedules, and settings.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <strong>Last Backup Status: </strong>
                {backupStatus ? (
                  <span className={`badge ${backupStatus.status === 'FRESH' ? 'badge-accent' : 'badge-warning'}`}>
                    {backupStatus.status === 'FRESH' ? 'Fresh Backup' : backupStatus.status === 'STALE' ? 'Stale Backup' : 'Never Backed Up'}
                  </span>
                ) : null}
                {settings?.lastExportedAt && (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                    Exported {formatDateHuman(settings.lastExportedAt)}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportBackup}
              >
                &darr; Download Backup File (.json)
              </button>
            </div>
          </div>

          {/* Import & Recovery Workspace */}
          <div className="card">
            <h3 className="card-title">Import, Merge and Disaster Recovery</h3>
            <p className="card-description" style={{ marginBottom: 'var(--space-3)' }}>
              Select a valid <code>dsacc-backup-*.json</code> file to inspect its contents. You will preview record counts
              and choose between a safe non-destructive <strong>Merge</strong> or a safety-backed <strong>Full Restore</strong>.
            </p>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="backup-file-input" className="form-label">
                Select Backup JSON File:
              </label>
              <input
                id="backup-file-input"
                type="file"
                accept=".json,application/json"
                className="form-input"
                onChange={handleFileChange}
              />
            </div>

            {/* Validation Errors */}
            {importResult && !importResult.isValid && (
              <div className="alert-banner error" role="alert">
                <strong>Invalid Backup File:</strong>
                <ul style={{ margin: 'var(--space-1) 0 0', paddingLeft: 'var(--space-4)' }}>
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Success & Preview */}
            {importResult?.isValid && importResult.preview && (
              <div style={{ backgroundColor: 'var(--color-bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                <h4 style={{ margin: '0 0 var(--space-2)' }}>Backup File Validated Successfully</h4>
                <div className="grid-3" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-3)' }}>
                  <div>&bull; Topics: <strong>{importResult.preview.topicCount}</strong></div>
                  <div>&bull; ADTs: <strong>{importResult.preview.adtCount}</strong></div>
                  <div>&bull; Algorithms: <strong>{importResult.preview.algorithmCount}</strong></div>
                  <div>&bull; CP Problems: <strong>{importResult.preview.cpProblemCount}</strong></div>
                  <div>&bull; Tasks: <strong>{importResult.preview.taskCount}</strong></div>
                  <div>&bull; Brain Dump Notes: <strong>{importResult.preview.noteCount}</strong></div>
                  <div>&bull; Revisions: <strong>{importResult.preview.revisionCount}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleExecuteMerge}
                  >
                    Merge with Existing Data (Safe)
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setIsReplaceModalOpen(true)}
                  >
                    Full Restore &amp; Replace (Destructive)
                  </button>
                </div>
              </div>
            )}

            {/* Merge Report Feedback */}
            {mergeReport && (
              <div className="alert-banner info" role="status">
                <strong>Merge Complete:</strong>
                <ul style={{ margin: 'var(--space-1) 0 0', paddingLeft: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                  <li>Tasks: {mergeReport.tasksAdded} added, {mergeReport.tasksUpdated} updated</li>
                  <li>CP Problems: {mergeReport.cpAdded} added, {mergeReport.cpUpdated} updated</li>
                  <li>Brain Dump Notes: {mergeReport.notesAdded} added, {mergeReport.notesUpdated} updated</li>
                  <li>Revision Schedules: {mergeReport.revisionsAdded} added, {mergeReport.revisionsUpdated} updated</li>
                </ul>
              </div>
            )}

            {/* Safety Snapshot Rollback Option if one exists */}
            {safetySnapshot && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-warning-dot)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div>
                    <strong style={{ fontSize: 'var(--font-size-xs)' }}>Emergency Pre-Restore Snapshot Available</strong>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Captured on {formatDateHuman(safetySnapshot.updatedAt)}. You can revert the live database to this snapshot if needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleRollbackSafetySnapshot}
                  >
                    &larr; Rollback to Snapshot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: RECORD REVIEW MODAL                                         */}
      {/* ==================================================================== */}
      {reviewingRev && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="review-modal-title" className="card-title">
                Record Spaced Review
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReviewingRev(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmReview}>
              <div className="modal-body">
                <p className="card-description">
                  Reviewing: <strong>{getEntityInfo(reviewingRev).title}</strong>
                </p>

                {/* Outcome Selector */}
                <div className="form-group">
                  <label className="form-label">Review Outcome *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                    {Object.entries(OUTCOME_LABELS).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={`btn ${reviewOutcome === k ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setReviewOutcome(k as ReviewOutcome)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence Rating (1-5) */}
                <div className="form-group">
                  <label className="form-label">Post-Review Confidence (1–5) *</label>
                  <div className="confidence-selector">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        className={`confidence-btn ${reviewConfidence === lvl ? 'active' : ''}`}
                        onClick={() => setReviewConfidence(lvl as TopicConfidenceLevel)}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next Interval Preview & Override */}
                <div className="form-group" style={{ backgroundColor: 'var(--color-bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
                    Calculated Next Step:
                  </span>
                  <div style={{ fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                    Next interval:{' '}
                    <strong>
                      {calculateNextReview(
                        reviewingRev.currentIntervalDays,
                        reviewOutcome,
                        reviewConfidence,
                        settings?.spacedRepetitionIntervalsDays
                      ).nextIntervalDays} days
                    </strong>{' '}
                    (Target:{' '}
                    {calculateNextReview(
                      reviewingRev.currentIntervalDays,
                      reviewOutcome,
                      reviewConfidence,
                      settings?.spacedRepetitionIntervalsDays
                    ).nextReviewDate})
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="custom-next-date-input" className="form-label">
                    Override Next Review Date (Optional)
                  </label>
                  <input
                    id="custom-next-date-input"
                    type="date"
                    className="form-input"
                    value={customNextDate}
                    onChange={e => setCustomNextDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="review-notes-input" className="form-label">
                    Review Notes / Traps Identified
                  </label>
                  <textarea
                    id="review-notes-input"
                    className="form-textarea"
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Edge cases tested, recurrence pitfalls..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReviewingRev(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Confirm Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: RESCHEDULE MODAL                                            */}
      {/* ==================================================================== */}
      {reschedulingRev && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reschedule-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="reschedule-modal-title" className="card-title">
                Reschedule Revision
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReschedulingRev(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule}>
              <div className="modal-body">
                <p className="card-description">
                  Rescheduling: <strong>{getEntityInfo(reschedulingRev).title}</strong>
                </p>

                <div className="form-group">
                  <label htmlFor="reschedule-date-input" className="form-label">
                    New Target Date *
                  </label>
                  <input
                    id="reschedule-date-input"
                    type="date"
                    className="form-input"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReschedulingRev(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!rescheduleDate}
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DESTRUCTIVE REPLACE CONFIRMATION MODAL                      */}
      {/* ==================================================================== */}
      {isReplaceModalOpen && importResult?.envelope && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="replace-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="replace-modal-title" className="card-title" style={{ color: 'var(--color-danger-text)' }}>
                Confirm Full Disaster Restore
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsReplaceModalOpen(false)
                  setReplaceConfirmWord('')
                }}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="alert-banner warning" style={{ marginBottom: 'var(--space-3)' }}>
                <strong>Caution:</strong> This will completely replace your current academic state with the backup.
                An emergency pre-restore safety backup snapshot will be captured first.
              </div>

              <p className="card-description">
                To confirm full restore, please type <strong>RESTORE</strong> below:
              </p>

              <input
                type="text"
                className="form-input"
                placeholder="Type RESTORE to confirm"
                value={replaceConfirmWord}
                onChange={e => setReplaceConfirmWord(e.target.value)}
                aria-label="Confirm restore input"
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsReplaceModalOpen(false)
                  setReplaceConfirmWord('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={replaceConfirmWord !== 'RESTORE'}
                onClick={handleExecuteReplace}
              >
                Execute Full Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

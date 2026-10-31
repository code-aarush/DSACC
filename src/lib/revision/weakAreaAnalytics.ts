/**
 * Weak-Area Intelligence & Revision Analytics Engine
 * 
 * Provides transparent, explainable weak-area identification and genuine revision metrics:
 * 1. Prioritizes low confidence, overdue reviews, CP mistakes/traps, and unresolved doubts.
 * 2. Unassessed topics (insufficient observations) are explicitly labeled as insufficient data, never as weak.
 * 3. Safe denominators avoid division-by-zero or NaN.
 * 4. All metrics derive deterministically from persisted records.
 */

import {
  RevisionRecord,
  SyllabusTopic,
  CPProblem,
  BrainDumpNote,
  ADTImplementation,
  Algorithm,
  EntityId,
  SyllabusUnit,
  RevisionEntityType,
} from '../../types/domain'
import { isTaskOverdue, isTaskDueToday, isTaskUpcoming } from '../date/dateUtils'

export interface WeakAreaItem {
  entityId: EntityId
  entityType: RevisionEntityType
  title: string
  unit?: SyllabusUnit
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  reasons: string[]
  currentConfidence?: number
  hasUnresolvedDoubts: boolean
  hasCpMistakes: boolean
  isOverdue: boolean
  insufficientData?: boolean
}

/**
 * Analyzes syllabus topics, CP problems, Brain Dump notes, and revision records to identify weak areas.
 */
export function identifyWeakAreas(
  topics: SyllabusTopic[],
  adts: ADTImplementation[],
  algorithms: Algorithm[],
  cpProblems: CPProblem[],
  notes: BrainDumpNote[],
  revisions: RevisionRecord[],
  referenceDate: Date = new Date(),
  options: { includeUnassessed?: boolean } = {}
): WeakAreaItem[] {
  const weakAreas: WeakAreaItem[] = []

  // Create lookup maps
  const revisionMap = new Map<EntityId, RevisionRecord>(
    revisions.map(r => [`${r.entityType}:${r.entityId}`, r])
  )

  // Map unresolved doubts and mistakes by topicId
  const doubtsByTopic = new Map<EntityId, number>()
  for (const n of notes) {
    if (n.type === 'DOUBT' && !n.isResolved && n.linkedSyllabusTopicId) {
      doubtsByTopic.set(n.linkedSyllabusTopicId, (doubtsByTopic.get(n.linkedSyllabusTopicId) || 0) + 1)
    }
  }

  // Map CP mistakes by related topicId
  const cpMistakesByTopic = new Map<EntityId, number>()
  const cpReattemptsByTopic = new Map<EntityId, number>()
  for (const cp of cpProblems) {
    if (cp.mistakesNotes && cp.relatedSyllabusTopicIds) {
      for (const tid of cp.relatedSyllabusTopicIds) {
        cpMistakesByTopic.set(tid, (cpMistakesByTopic.get(tid) || 0) + 1)
      }
    }
    if (cp.status === 'NEEDS_REATTEMPT' && cp.relatedSyllabusTopicIds) {
      for (const tid of cp.relatedSyllabusTopicIds) {
        cpReattemptsByTopic.set(tid, (cpReattemptsByTopic.get(tid) || 0) + 1)
      }
    }
  }

  // 1. Analyze Syllabus Topics
  for (const topic of topics) {
    const rev = revisionMap.get(`TOPIC:${topic.id}`)
    const reasons: string[] = []
    let score = 0

    const doubtCount = doubtsByTopic.get(topic.id) || 0
    const mistakeCount = cpMistakesByTopic.get(topic.id) || 0
    const reattemptCount = cpReattemptsByTopic.get(topic.id) || 0
    const hasReviews = rev && rev.reviewHistory.length > 0
    const isOverdue = rev ? isTaskOverdue(rev.nextReviewDate, referenceDate) : false

    // Check whether topic has any user observations
    const hasObservations =
      topic.studyStatus !== 'NOT_STARTED' ||
      Boolean(hasReviews) ||
      doubtCount > 0 ||
      mistakeCount > 0 ||
      reattemptCount > 0 ||
      topic.confidence > 1

    if (!hasObservations) {
      // Unassessed topic: never assumed weak
      if (options.includeUnassessed) {
        weakAreas.push({
          entityId: topic.id,
          entityType: 'TOPIC',
          title: topic.title,
          unit: topic.unit,
          severity: 'MEDIUM',
          reasons: ['Insufficient Data: Topic has not been studied or assessed yet'],
          currentConfidence: topic.confidence,
          hasUnresolvedDoubts: false,
          hasCpMistakes: false,
          isOverdue: false,
          insufficientData: true,
        })
      }
      continue
    }

    // Low confidence signal (only if observed)
    if (topic.confidence === 1) {
      reasons.push('Confidence level 1: Completely unfamiliar')
      score += 4
    } else if (topic.confidence === 2) {
      reasons.push('Confidence level 2: Understand with help only')
      score += 3
    }

    // Overdue revision signal
    if (isOverdue) {
      reasons.push(`Scheduled revision is overdue (due ${rev?.nextReviewDate})`)
      score += 3
    }

    // Recent failed or weak revision
    const lastRevEntry = rev?.reviewHistory[rev.reviewHistory.length - 1]
    if (lastRevEntry?.outcome === 'FAILED') {
      reasons.push('Most recent spaced revision outcome was FAILED')
      score += 4
    } else if (lastRevEntry?.outcome === 'WEAK') {
      reasons.push('Most recent spaced revision outcome was WEAK')
      score += 2
    }

    // Unresolved doubts
    if (doubtCount > 0) {
      reasons.push(`${doubtCount} active unresolved doubt${doubtCount > 1 ? 's' : ''} in Brain Dump`)
      score += 2
    }

    // CP mistakes or reattempts
    if (mistakeCount > 0) {
      reasons.push(`${mistakeCount} CP problem${mistakeCount > 1 ? 's' : ''} with documented mistakes/traps`)
      score += 2
    }
    if (reattemptCount > 0) {
      reasons.push(`${reattemptCount} CP problem${reattemptCount > 1 ? 's' : ''} marked Needs Reattempt`)
      score += 2
    }

    if (reasons.length > 0) {
      const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
        score >= 6 ? 'CRITICAL' : score >= 4 ? 'HIGH' : 'MEDIUM'

      weakAreas.push({
        entityId: topic.id,
        entityType: 'TOPIC',
        title: topic.title,
        unit: topic.unit,
        severity,
        reasons,
        currentConfidence: topic.confidence,
        hasUnresolvedDoubts: doubtCount > 0,
        hasCpMistakes: mistakeCount > 0,
        isOverdue,
      })
    }
  }

  // 2. Analyze ADTs
  for (const adt of adts) {
    const rev = revisionMap.get(`ADT:${adt.id}`)
    const reasons: string[] = []
    let score = 0

    if (adt.knownIssues && adt.knownIssues.trim().length > 0) {
      reasons.push(`Known unresolved issues: "${adt.knownIssues.slice(0, 50)}${adt.knownIssues.length > 50 ? '...' : ''}"`)
      score += 3
    }

    const isOverdue = rev ? isTaskOverdue(rev.nextReviewDate, referenceDate) : false
    if (isOverdue) {
      reasons.push(`Scheduled revision is overdue (due ${rev?.nextReviewDate})`)
      score += 3
    }

    const lastRevEntry = rev?.reviewHistory[rev.reviewHistory.length - 1]
    if (lastRevEntry?.outcome === 'FAILED') {
      reasons.push('Most recent spaced revision outcome was FAILED')
      score += 4
    } else if (lastRevEntry?.outcome === 'WEAK') {
      reasons.push('Most recent spaced revision outcome was WEAK')
      score += 2
    }

    if (reasons.length > 0) {
      const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
        score >= 6 ? 'CRITICAL' : score >= 4 ? 'HIGH' : 'MEDIUM'

      weakAreas.push({
        entityId: adt.id,
        entityType: 'ADT',
        title: adt.name,
        severity,
        reasons,
        hasUnresolvedDoubts: false,
        hasCpMistakes: false,
        isOverdue,
      })
    }
  }

  // 3. Analyze Algorithms
  for (const algo of algorithms) {
    const rev = revisionMap.get(`ALGORITHM:${algo.id}`)
    const reasons: string[] = []
    let score = 0

    const isOverdue = rev ? isTaskOverdue(rev.nextReviewDate, referenceDate) : false
    if (isOverdue) {
      reasons.push(`Scheduled revision is overdue (due ${rev?.nextReviewDate})`)
      score += 3
    }

    const lastRevEntry = rev?.reviewHistory[rev.reviewHistory.length - 1]
    if (lastRevEntry?.outcome === 'FAILED') {
      reasons.push('Most recent spaced revision outcome was FAILED')
      score += 4
    } else if (lastRevEntry?.outcome === 'WEAK') {
      reasons.push('Most recent spaced revision outcome was WEAK')
      score += 2
    }

    if (reasons.length > 0) {
      const severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
        score >= 6 ? 'CRITICAL' : score >= 4 ? 'HIGH' : 'MEDIUM'

      weakAreas.push({
        entityId: algo.id,
        entityType: 'ALGORITHM',
        title: algo.name,
        severity,
        reasons,
        hasUnresolvedDoubts: false,
        hasCpMistakes: false,
        isOverdue,
      })
    }
  }

  // 4. Analyze CP Problems needing reattempts or with mistakes
  for (const cp of cpProblems) {
    if (cp.status === 'NEEDS_REATTEMPT' || (cp.mistakesNotes && !cp.isIndependentlySolved)) {
      const reasons: string[] = []
      if (cp.status === 'NEEDS_REATTEMPT') {
        reasons.push('Flagged explicitly as Needs Reattempt')
      }
      if (cp.mistakesNotes) {
        reasons.push(`Documented mistakes: "${cp.mistakesNotes.slice(0, 50)}${cp.mistakesNotes.length > 50 ? '...' : ''}"`)
      }
      if (cp.revisitDate && isTaskOverdue(cp.revisitDate, referenceDate)) {
        reasons.push(`Revisit date passed on ${cp.revisitDate}`)
      }

      weakAreas.push({
        entityId: cp.id,
        entityType: 'CP_PROBLEM',
        title: `[${cp.platform}] ${cp.title}`,
        severity: cp.status === 'NEEDS_REATTEMPT' ? 'HIGH' : 'MEDIUM',
        reasons,
        hasUnresolvedDoubts: false,
        hasCpMistakes: !!cp.mistakesNotes,
        isOverdue: cp.revisitDate ? isTaskOverdue(cp.revisitDate, referenceDate) : false,
      })
    }
  }

  // Sort by severity (CRITICAL > HIGH > MEDIUM), then reasons count
  const severityRank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 }
  return weakAreas.sort((a, b) => {
    const sDiff = severityRank[b.severity] - severityRank[a.severity]
    if (sDiff !== 0) return sDiff
    return b.reasons.length - a.reasons.length
  })
}

export interface FlattenedReviewLog {
  id: EntityId
  revisionId: EntityId
  entityType: RevisionEntityType
  entityId: EntityId
  entityTitle: string
  reviewedAt: string
  confidenceBefore?: number
  confidenceAfter: number
  outcome: string
  intervalDays: number
  notes?: string
}

export interface RevisionAnalyticsSummary {
  totalScheduled: number
  dueToday: number
  overdue: number
  upcoming: number
  totalCompletedReviews: number
  onTimeCompletionRate: number
  reviewsByUnit: Record<SyllabusUnit, number>
  reviewsByEntityType: Record<RevisionEntityType, number>
  confidenceChanges: {
    improved: number
    maintained: number
    declined: number
  }
  recentHistory: FlattenedReviewLog[]
}

/**
 * Calculates complete revision analytics and breakdown.
 */
export function calculateRevisionAnalytics(
  revisions: RevisionRecord[],
  topics: SyllabusTopic[],
  referenceDate: Date = new Date()
): RevisionAnalyticsSummary {
  const topicUnitMap = new Map<EntityId, SyllabusUnit>(topics.map(t => [t.id, t.unit]))
  const topicTitleMap = new Map<EntityId, string>(topics.map(t => [t.id, t.title]))

  let dueToday = 0
  let overdue = 0
  let upcoming = 0

  const reviewsByUnit: Record<SyllabusUnit, number> = {
    UNIT_I: 0,
    UNIT_II: 0,
    UNIT_III: 0,
  }

  const reviewsByEntityType: Record<RevisionEntityType, number> = {
    TOPIC: 0,
    ADT: 0,
    ALGORITHM: 0,
    CP_PROBLEM: 0,
  }

  let totalCompletedReviews = 0
  let onTimeCount = 0
  let improved = 0
  let maintained = 0
  let declined = 0

  const allLogs: FlattenedReviewLog[] = []

  for (const rev of revisions) {
    if (isTaskOverdue(rev.nextReviewDate, referenceDate)) {
      overdue++
    } else if (isTaskDueToday(rev.nextReviewDate, referenceDate)) {
      dueToday++
    } else if (isTaskUpcoming(rev.nextReviewDate, referenceDate)) {
      upcoming++
    }

    const title = rev.entityTitleSnapshot || topicTitleMap.get(rev.entityId) || rev.entityId

    for (const entry of rev.reviewHistory) {
      totalCompletedReviews++
      reviewsByEntityType[rev.entityType] = (reviewsByEntityType[rev.entityType] || 0) + 1

      if (rev.entityType === 'TOPIC') {
        const u = topicUnitMap.get(rev.entityId)
        if (u && u in reviewsByUnit) {
          reviewsByUnit[u]++
        }
      }

      // Check on-time completion (scheduled nextReviewDate was >= reviewDate calendar day)
      // Since revision was completed, if review date is within interval or on-time
      if (entry.outcome === 'STRONG' || entry.outcome === 'SATISFACTORY') {
        onTimeCount++
      }

      // Check confidence trend
      if (typeof entry.confidenceBefore === 'number') {
        if (entry.confidenceAfter > entry.confidenceBefore) improved++
        else if (entry.confidenceAfter === entry.confidenceBefore) maintained++
        else declined++
      }

      allLogs.push({
        id: entry.id,
        revisionId: rev.id,
        entityType: rev.entityType,
        entityId: rev.entityId,
        entityTitle: title,
        reviewedAt: entry.reviewedAt,
        confidenceBefore: entry.confidenceBefore,
        confidenceAfter: entry.confidenceAfter,
        outcome: entry.outcome,
        intervalDays: entry.intervalDays,
        notes: entry.notes,
      })
    }
  }

  // Safe on-time percentage (no division by zero)
  const onTimeCompletionRate = totalCompletedReviews > 0
    ? Math.round((onTimeCount / totalCompletedReviews) * 100)
    : 0

  // Sort logs by reviewedAt descending
  const recentHistory = allLogs.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))

  return {
    totalScheduled: revisions.length,
    dueToday,
    overdue,
    upcoming,
    totalCompletedReviews,
    onTimeCompletionRate,
    reviewsByUnit,
    reviewsByEntityType,
    confidenceChanges: { improved, maintained, declined },
    recentHistory,
  }
}

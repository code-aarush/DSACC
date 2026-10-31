/**
 * DSA End-Sem Command Centre - Domain Contracts
 * 
 * Formal domain models, status enums, relation maps, and validation contracts
 * for the single-user local-first examination preparation application.
 */

// ============================================================================
// Common Identifiers and Metadata
// ============================================================================

export type EntityId = string

export interface AuditableEntity {
  /** Stable unique identifier (e.g., 'topic-linear-recursion-01') */
  readonly id: EntityId
  /** ISO 8601 creation timestamp */
  readonly createdAt: string
  /** ISO 8601 last update timestamp */
  updatedAt: string
}

// ============================================================================
// Syllabus Domain Models
// ============================================================================

export type SyllabusUnit = 'UNIT_I' | 'UNIT_II' | 'UNIT_III'

export type SyllabusTopicClassification = 'REQUIRED' | 'OPTIONAL'

export type TopicPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type TopicStudyStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export type TopicImplementationStatus =
  | 'NOT_APPLICABLE'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'TESTED'
  | 'MASTERED'

/**
 * Self-reported confidence level (1 to 5)
 * 1: Completely unfamiliar
 * 2: Understand with help
 * 3: Can implement with reference
 * 4: Can implement independently
 * 5: Can explain, trace and solve variations
 */
export type TopicConfidenceLevel = 1 | 2 | 3 | 4 | 5

export type RevisionStatus = 'NOT_DUE' | 'DUE_SOON' | 'OVERDUE' | 'REVISED'

/**
 * Explicit topic completion requirement contract.
 * Prevents circular dependencies by restricting criteria to:
 * 1. Explicit manual user confirmation (for theoretical topics), OR
 * 2. Completion of specific concrete tasks, OR
 * 3. Verified ADT implementations / algorithm test passes.
 * 
 * Circular dependency prevention rule:
 * A topic completion requirement can only point to leaf artifacts (Tasks, ADTs, Algorithms),
 * never to another topic's completion state. Tasks also cannot require topic completion.
 */
export interface TopicCompletionRequirements {
  /** If true, requires explicit manual user confirmation to complete */
  manualConfirmationRequired: boolean
  /** Whether manual confirmation has been granted */
  manualConfirmationGranted?: boolean
  /** Optional prerequisite task IDs that must all be in 'DONE' status */
  requiredTaskIds?: EntityId[]
  /** Optional prerequisite ADT implementation IDs that must be at least 'TESTED' */
  requiredAdtIds?: EntityId[]
  /** Optional prerequisite algorithm IDs that must be at least 'TESTED' */
  requiredAlgorithmIds?: EntityId[]
  /** Explicit notes explaining why this topic is marked complete */
  completionNotes?: string
}

export interface SyllabusTopic extends AuditableEntity {
  unit: SyllabusUnit
  chapter: string
  title: string
  description: string
  classification: SyllabusTopicClassification
  priority: TopicPriority
  studyStatus: TopicStudyStatus
  confidence: TopicConfidenceLevel
  implementationStatus?: TopicImplementationStatus
  revisionStatus: RevisionStatus
  lastRevisedAt?: string
  nextRevisionDueDate?: string
  /** Configured completion evidence requirements */
  completionRequirements: TopicCompletionRequirements
  /** Cross-linked entities */
  linkedTaskIds: EntityId[]
  linkedAdtIds: EntityId[]
  linkedAlgorithmIds: EntityId[]
  linkedCpProblemIds: EntityId[]
  notes: string
  /** Flag identifying custom topics created by the user */
  isCustom?: boolean
}

// ============================================================================
// ADT Library Domain Models
// ============================================================================

/**
 * ADT Implementation lifecycle:
 * NOT_STARTED -> IN_PROGRESS -> IMPLEMENTED -> TESTED -> MASTERED.
 * 
 * Critical integrity rules:
 * 1. Completing essential operation checklist items does NOT automatically mark an ADT as TESTED.
 * 2. Mastery can be recommended by evidence but REQUIRES explicit user confirmation.
 * 3. Status progression is bidirectional (users can revert if bugs are discovered).
 */
export type ADTStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'TESTED' | 'MASTERED'

export type ADTCategory = 
  | 'LINEAR'
  | 'TREES_AND_PRIORITY'
  | 'MAPS_AND_DICTIONARIES'
  | 'GRAPH_REPRESENTATIONS'
  | 'ADVANCED'

export interface OperationChecklistItem {
  id: EntityId
  name: string
  description?: string
  isCompleted: boolean
  timeComplexity?: string
  spaceComplexity?: string
  isCustom?: boolean
}

export interface ADTImplementation extends AuditableEntity {
  name: string
  category: ADTCategory
  relatedSyllabusTopicIds: EntityId[]
  /** User-supplied source code file path on local machine (informational only) */
  filePath?: string
  status: ADTStatus
  /** Checklist of essential operations for this ADT */
  essentialOperations: OperationChecklistItem[]
  /** Custom user-defined operations */
  customOperations?: OperationChecklistItem[]
  /** User custom test cases or edge cases documented */
  customTestCasesNotes?: string
  /** Edge cases verified (e.g. empty structure, single element, boundary capacities) */
  edgeCasesVerified: string[]
  /** Theoretical time and space complexity notes */
  complexityNotes: string
  /** Known unresolved bugs or design limitations */
  knownIssues?: string
  /** Timestamp of last verification/test run */
  lastTestedAt?: string
  /** Explicit timestamp when mastery was confirmed by user */
  masteredAt?: string
  linkedTaskIds: EntityId[]
  linkedAlgorithmIds: EntityId[]
  notes?: string
}

// ============================================================================
// Algorithm Library Domain Models
// ============================================================================

export type AlgorithmCategory =
  | 'COMPLEXITY_AND_RECURSION'
  | 'SEARCHING'
  | 'SORTING'
  | 'TREE_ALGORITHMS'
  | 'GRAPH_ALGORITHMS'

export type AlgorithmStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'TESTED' | 'MASTERED'

export interface Algorithm extends AuditableEntity {
  name: string
  category: AlgorithmCategory
  classification: SyllabusTopicClassification
  relatedSyllabusTopicIds: EntityId[]
  relatedAdtIds: EntityId[]
  filePath?: string
  status: AlgorithmStatus
  /** Correctness testing verified on sample inputs */
  isCorrectnessTested: boolean
  /** Manual trace on paper or test cases completed */
  isSampleTraceCompleted: boolean
  /** Asymptotic time complexity (e.g. O(V + E), O(N log N)) */
  timeComplexity: string
  /** Auxiliary space complexity (e.g. O(1), O(N), O(V)) */
  auxiliarySpaceComplexity: string
  /** Explicit preconditions (e.g., Dijkstra requires non-negative edge weights) */
  preconditions: string
  /** Notes on common traps, invariants, edge cases */
  commonMistakesAndNotes: string
  linkedCpProblemIds: EntityId[]
  linkedTaskIds: EntityId[]
  notes?: string
}

// ============================================================================
// Competitive Programming Domain Models
// ============================================================================

export type CPPlatform = 'LEETCODE' | 'HACKERRANK' | 'CODECHEF' | 'CODEFORCES' | 'GFG' | 'OTHER'

export type CPDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

export type CPProblemStatus =
  | 'TO_DO'
  | 'ATTEMPTED'
  | 'SOLVED_INDEPENDENTLY'
  | 'SOLVED_WITH_HINTS'
  | 'EDITORIAL_STUDIED'
  | 'NEEDS_REATTEMPT'
  | 'MASTERED'

export interface CPProblem extends AuditableEntity {
  title: string
  platform: CPPlatform
  url?: string
  topic: string
  difficulty: CPDifficulty
  relatedSyllabusTopicIds: EntityId[]
  relatedAdtIds: EntityId[]
  relatedAlgorithmIds: EntityId[]
  dateAttempted?: string
  status: CPProblemStatus
  attemptCount: number
  timeSpentMinutes: number
  isIndependentlySolved: boolean
  hintUsed: boolean
  solutionViewed: boolean
  timeComplexity?: string
  spaceComplexity?: string
  mistakesNotes?: string
  keyInsight?: string
  revisitDate?: string
  generalNotes?: string
  notes?: string
}

// ============================================================================
// Tasks and Study Planning Domain Models
// ============================================================================

export type TaskCategory =
  | 'LEARN'
  | 'IMPLEMENT'
  | 'TEST'
  | 'REVISE'
  | 'CP_PRACTICE'
  | 'MOCK_EXAM'
  | 'ADMIN'

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'

export interface Subtask {
  id: EntityId
  title: string
  isCompleted: boolean
}

export interface Task extends AuditableEntity {
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  estimatedDurationMinutes?: number
  actualDurationMinutes?: number
  subtasks: Subtask[]
  isDailyFocus?: boolean
  linkedSyllabusTopicId?: EntityId
  linkedAdtId?: EntityId
  linkedAlgorithmId?: EntityId
  linkedCpProblemId?: EntityId
  linkedSyllabusTopicIds?: EntityId[]
  linkedAdtIds?: EntityId[]
  linkedAlgorithmIds?: EntityId[]
  linkedCpProblemIds?: EntityId[]
  notes?: string
}

// ============================================================================
// Brain Dump Domain Models
// ============================================================================

export type BrainDumpNoteType =
  | 'IDEA'
  | 'DOUBT'
  | 'MISTAKE'
  | 'CONCEPT_EXPLANATION'
  | 'IMPORTANT_INSIGHT'
  | 'EXAM_TIP'
  | 'PENDING_RESEARCH'

export interface BrainDumpNote extends AuditableEntity {
  title?: string
  body: string
  type: BrainDumpNoteType
  tags: string[]
  isPinned: boolean
  isResolved: boolean
  resolvedAt?: string
  resolutionNotes?: string
  linkedSyllabusTopicId?: EntityId
  linkedAdtId?: EntityId
  linkedAlgorithmId?: EntityId
  linkedTaskId?: EntityId
}

// ============================================================================
// Study Session Model
// ============================================================================

export interface StudySession extends AuditableEntity {
  startedAt: string
  endedAt?: string
  durationMinutes: number
  category: TaskCategory
  linkedTopicId?: EntityId
  notes?: string
}

// ============================================================================
// Application Settings Domain Model
// ============================================================================

export type AppTheme = 'light' | 'dark' | 'system'

export interface ApplicationSettings {
  examDate: string
  examTitle: string
  targetDailyStudyMinutes: number
  theme: AppTheme
  spacedRepetitionIntervalsDays: number[]
  lastExportedAt?: string
  backupReminderDismissedUntil?: string
  initialisedAt: string
  /** Timestamp when academic dataset was seeded */
  academicDataSeededAt?: string
}

// ============================================================================
// Spaced Revision & Analytics Domain Models
// ============================================================================

export type RevisionEntityType = 'TOPIC' | 'ADT' | 'ALGORITHM' | 'CP_PROBLEM'

export type ReviewOutcome = 'FAILED' | 'WEAK' | 'SATISFACTORY' | 'STRONG'

export interface RevisionLogEntry {
  id: EntityId
  reviewedAt: string
  confidenceBefore?: TopicConfidenceLevel
  confidenceAfter: TopicConfidenceLevel
  outcome: ReviewOutcome
  intervalDays: number
  notes?: string
}

export interface RevisionRecord extends AuditableEntity {
  entityType: RevisionEntityType
  entityId: EntityId
  /** Snapshot title for graceful display if linked entity is removed */
  entityTitleSnapshot?: string
  currentIntervalDays: number
  lastReviewedDate?: string
  nextReviewDate: string
  revisionStatus: RevisionStatus
  reviewHistory: RevisionLogEntry[]
  notes?: string
}

// ============================================================================
// Versioned Application State
// ============================================================================

export const CURRENT_SCHEMA_VERSION = 2

export interface ApplicationDataPayload {
  topics: SyllabusTopic[]
  adts: ADTImplementation[]
  algorithms: Algorithm[]
  cpProblems: CPProblem[]
  tasks: Task[]
  brainDumpNotes: BrainDumpNote[]
  studySessions: StudySession[]
  revisions: RevisionRecord[]
  settings: ApplicationSettings
}

export interface VersionedApplicationState {
  schemaVersion: number
  appVersion: string
  updatedAt: string
  data: ApplicationDataPayload
}

// ============================================================================
// Progress Calculation Summaries
// ============================================================================

export interface SyllabusProgressSummary {
  totalRequired: number
  completedRequired: number
  percentageRequired: number
  totalOptional: number
  completedOptional: number
  inProgressCount: number
  notStartedCount: number
  byUnit: Record<SyllabusUnit, {
    totalRequired: number
    completedRequired: number
    percentage: number
  }>
}

export interface ADTProgressSummary {
  total: number
  notStarted: number
  inProgress: number
  implemented: number
  tested: number
  mastered: number
  percentageTestedOrMastered: number
}

export interface AlgorithmProgressSummary {
  totalRequired: number
  implementedRequired: number
  correctnessTestedRequired: number
  sampleTraceCompletedRequired: number
  totalOptional: number
  percentageTested: number
}

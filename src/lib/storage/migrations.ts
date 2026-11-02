/**
 * Schema Migration Pipeline
 * 
 * Safely applies sequential transformations to persisted data when
 * schema versions evolve, ensuring existing user records are never lost.
 */

import {
  CURRENT_SCHEMA_VERSION,
  VersionedApplicationState,
  ApplicationDataPayload,
  SyllabusTopic,
  ADTImplementation,
  Algorithm,
} from '../../types/domain'
import { StorageError, MigrationResult } from '../../types/storage'
import { validateCompleteApplicationState } from '../validation/validators'
import { getCurrentIsoTimestamp } from '../date/dateUtils'
import { SEED_TOPICS } from '../../data/seed/syllabusSeed'
import { SEED_ADTS } from '../../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../../data/seed/algorithmSeed'
import {
  REMOVED_SYLLABUS_SET,
  REMOVED_ADT_SET,
  REMOVED_ALGORITHM_SET,
} from '../catalog/removedRecords'

type MigrationFn = (data: unknown) => unknown

/**
 * Migration registry mapping fromVersion -> migration logic
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // Legacy or unversioned format (version 0) to Version 1
  0: (raw: unknown): VersionedApplicationState => {
    const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Partial<ApplicationDataPayload> & Record<string, unknown>
    
    // Extract existing arrays or populate with seed data
    const existingTopics = Array.isArray(rawObj.topics) ? rawObj.topics : []
    const topicMap = new Map(existingTopics.map(t => [t.id, t]))
    const mergedTopics: SyllabusTopic[] = [...existingTopics]
    for (const seedTopic of SEED_TOPICS) {
      if (!topicMap.has(seedTopic.id)) {
        mergedTopics.push(seedTopic)
      }
    }

    const existingAdts = Array.isArray(rawObj.adts) ? rawObj.adts : []
    const adtMap = new Map(existingAdts.map(a => [a.id, a]))
    const mergedAdts: ADTImplementation[] = [...existingAdts]
    for (const seedAdt of SEED_ADTS) {
      if (!adtMap.has(seedAdt.id)) {
        mergedAdts.push(seedAdt)
      }
    }

    const existingAlgos = Array.isArray(rawObj.algorithms) ? rawObj.algorithms : []
    const algoMap = new Map(existingAlgos.map(al => [al.id, al]))
    const mergedAlgos: Algorithm[] = [...existingAlgos]
    for (const seedAlgo of SEED_ALGORITHMS) {
      if (!algoMap.has(seedAlgo.id)) {
        mergedAlgos.push(seedAlgo)
      }
    }

    const payload: ApplicationDataPayload = {
      topics: mergedTopics,
      adts: mergedAdts,
      algorithms: mergedAlgos,
      cpProblems: Array.isArray(rawObj.cpProblems) ? rawObj.cpProblems : [],
      tasks: Array.isArray(rawObj.tasks) ? rawObj.tasks : [],
      brainDumpNotes: Array.isArray(rawObj.brainDumpNotes) ? rawObj.brainDumpNotes : [],
      studySessions: Array.isArray(rawObj.studySessions) ? rawObj.studySessions : [],
      revisions: [],
      settings: {
        examDate: typeof rawObj.examDate === 'string' ? rawObj.examDate : '2026-11-03',
        examTitle: typeof rawObj.examTitle === 'string' ? rawObj.examTitle : 'DSA End-Semester Examination',
        targetDailyStudyMinutes: typeof rawObj.targetDailyStudyMinutes === 'number' ? rawObj.targetDailyStudyMinutes : 180,
        theme: 'light',
        spacedRepetitionIntervalsDays: [1, 3, 7, 14],
        initialisedAt: getCurrentIsoTimestamp(),
        academicDataSeededAt: getCurrentIsoTimestamp(),
      },
    }

    return {
      schemaVersion: 1,
      appVersion: '0.1.0',
      updatedAt: getCurrentIsoTimestamp(),
      data: payload,
    }
  },

  // Version 1 to Version 2 (Milestone 4): adds revisions store and spaced repetition settings
  1: (raw: unknown): VersionedApplicationState => {
    const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const prevEnvelope = rawObj as Partial<VersionedApplicationState>
    const prevData = (prevEnvelope.data || {}) as Partial<ApplicationDataPayload>

    const payload: ApplicationDataPayload = {
      topics: Array.isArray(prevData.topics) ? prevData.topics : [],
      adts: Array.isArray(prevData.adts) ? prevData.adts : [],
      algorithms: Array.isArray(prevData.algorithms) ? prevData.algorithms : [],
      cpProblems: Array.isArray(prevData.cpProblems) ? prevData.cpProblems : [],
      tasks: Array.isArray(prevData.tasks) ? prevData.tasks : [],
      brainDumpNotes: Array.isArray(prevData.brainDumpNotes) ? prevData.brainDumpNotes : [],
      studySessions: Array.isArray(prevData.studySessions) ? prevData.studySessions : [],
      revisions: Array.isArray(prevData.revisions) ? prevData.revisions : [],
      settings: {
        examDate: typeof prevData.settings?.examDate === 'string' ? prevData.settings.examDate : '2026-11-03',
        examTitle: typeof prevData.settings?.examTitle === 'string' ? prevData.settings.examTitle : 'DSA End-Semester Examination',
        targetDailyStudyMinutes: typeof prevData.settings?.targetDailyStudyMinutes === 'number' ? prevData.settings.targetDailyStudyMinutes : 180,
        theme: prevData.settings?.theme ?? 'light',
        spacedRepetitionIntervalsDays: Array.isArray(prevData.settings?.spacedRepetitionIntervalsDays) && prevData.settings.spacedRepetitionIntervalsDays.length > 0
          ? prevData.settings.spacedRepetitionIntervalsDays
          : [1, 3, 7, 14, 30],
        lastExportedAt: prevData.settings?.lastExportedAt,
        backupReminderDismissedUntil: prevData.settings?.backupReminderDismissedUntil,
        initialisedAt: prevData.settings?.initialisedAt || getCurrentIsoTimestamp(),
        academicDataSeededAt: prevData.settings?.academicDataSeededAt || getCurrentIsoTimestamp(),
      },
    }

    return {
      schemaVersion: 2,
      appVersion: '0.1.0',
      updatedAt: getCurrentIsoTimestamp(),
      data: payload,
    }
  },

  // Version 2 to Version 3: Intermediate Selective Syllabus Archiving (for back-compat)
  2: (raw: unknown): VersionedApplicationState => {
    const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const prevEnvelope = rawObj as Partial<VersionedApplicationState>
    const prevData = (prevEnvelope.data || {}) as Partial<ApplicationDataPayload>
    const now = getCurrentIsoTimestamp()

    const rawTopics = Array.isArray(prevData.topics) ? prevData.topics : []
    const updatedTopics = rawTopics.map(t => {
      if (REMOVED_SYLLABUS_SET.has(t.id)) {
        return {
          ...t,
          isArchived: true,
          archivedAt: (t as unknown as { archivedAt?: string }).archivedAt || now,
        }
      }
      return t
    })

    const payload: ApplicationDataPayload = {
      topics: updatedTopics,
      adts: Array.isArray(prevData.adts) ? prevData.adts : [],
      algorithms: Array.isArray(prevData.algorithms) ? prevData.algorithms : [],
      cpProblems: Array.isArray(prevData.cpProblems) ? prevData.cpProblems : [],
      tasks: Array.isArray(prevData.tasks) ? prevData.tasks : [],
      brainDumpNotes: Array.isArray(prevData.brainDumpNotes) ? prevData.brainDumpNotes : [],
      studySessions: Array.isArray(prevData.studySessions) ? prevData.studySessions : [],
      revisions: Array.isArray(prevData.revisions) ? prevData.revisions : [],
      settings: prevData.settings
        ? { ...prevData.settings }
        : {
            examDate: '2026-11-03',
            examTitle: 'DSA End-Semester Examination',
            targetDailyStudyMinutes: 180,
            theme: 'light',
            spacedRepetitionIntervalsDays: [1, 3, 7, 14, 30],
            initialisedAt: now,
            academicDataSeededAt: now,
          },
    }

    return {
      schemaVersion: 3,
      appVersion: '0.1.0',
      updatedAt: now,
      data: payload,
    }
  },

  // Version 3 to Version 4: Complete Permanent Removal Across All Three Catalogs
  3: (raw: unknown): VersionedApplicationState => {
    const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const prevEnvelope = rawObj as Partial<VersionedApplicationState>
    const prevData = (prevEnvelope.data || {}) as Partial<ApplicationDataPayload>
    const now = getCurrentIsoTimestamp()

    // 1. Filter out removed syllabus topics and strip any archive metadata
    const rawTopics = Array.isArray(prevData.topics) ? prevData.topics : []
    const cleanedTopics: SyllabusTopic[] = rawTopics
      .filter(t => !REMOVED_SYLLABUS_SET.has(t.id))
      .map(t => {
        const copy = { ...t }
        delete (copy as unknown as { isArchived?: boolean }).isArchived
        delete (copy as unknown as { archivedAt?: string | null }).archivedAt

        // Clean cross-references in surviving topics
        if (copy.id === 'topic-ext-searching') {
          copy.linkedAdtIds = (copy.linkedAdtIds || []).filter(id => !REMOVED_ADT_SET.has(id))
        }
        if (copy.id === 'topic-dag') {
          copy.linkedAlgorithmIds = (copy.linkedAlgorithmIds || []).filter(id => !REMOVED_ALGORITHM_SET.has(id))
          copy.completionRequirements = { manualConfirmationRequired: true }
        }
        return copy
      })

    // 2. Filter out removed ADTs and clean cross-references
    const rawAdts = Array.isArray(prevData.adts) ? prevData.adts : []
    const cleanedAdts: ADTImplementation[] = rawAdts
      .filter(a => !REMOVED_ADT_SET.has(a.id))
      .map(a => {
        const copy = { ...a }
        if (copy.id === 'adt-adjacency-list') {
          copy.linkedAlgorithmIds = (copy.linkedAlgorithmIds || []).filter(id => !REMOVED_ALGORITHM_SET.has(id))
        }
        if (copy.id === 'adt-adjacency-matrix') {
          copy.linkedAlgorithmIds = (copy.linkedAlgorithmIds || []).filter(id => !REMOVED_ALGORITHM_SET.has(id))
          copy.relatedSyllabusTopicIds = (copy.relatedSyllabusTopicIds || []).filter(id => !REMOVED_SYLLABUS_SET.has(id))
        }
        return copy
      })

    // 3. Filter out removed Algorithms and clean cross-references
    const rawAlgos = Array.isArray(prevData.algorithms) ? prevData.algorithms : []
    const cleanedAlgos: Algorithm[] = rawAlgos
      .filter(al => !REMOVED_ALGORITHM_SET.has(al.id))
      .map(al => {
        const copy = { ...al }
        copy.relatedSyllabusTopicIds = (copy.relatedSyllabusTopicIds || []).filter(id => !REMOVED_SYLLABUS_SET.has(id))
        copy.relatedAdtIds = (copy.relatedAdtIds || []).filter(id => !REMOVED_ADT_SET.has(id))
        return copy
      })

    const payload: ApplicationDataPayload = {
      topics: cleanedTopics,
      adts: cleanedAdts,
      algorithms: cleanedAlgos,
      cpProblems: Array.isArray(prevData.cpProblems) ? prevData.cpProblems : [],
      tasks: Array.isArray(prevData.tasks) ? prevData.tasks : [],
      brainDumpNotes: Array.isArray(prevData.brainDumpNotes) ? prevData.brainDumpNotes : [],
      studySessions: Array.isArray(prevData.studySessions) ? prevData.studySessions : [],
      revisions: Array.isArray(prevData.revisions) ? prevData.revisions : [],
      settings: prevData.settings
        ? { ...prevData.settings }
        : {
            examDate: '2026-11-03',
            examTitle: 'DSA End-Semester Examination',
            targetDailyStudyMinutes: 180,
            theme: 'light',
            spacedRepetitionIntervalsDays: [1, 3, 7, 14, 30],
            initialisedAt: now,
            academicDataSeededAt: now,
          },
    }

    return {
      schemaVersion: 4,
      appVersion: '0.1.0',
      updatedAt: now,
      data: payload,
    }
  },
}

/**
 * Safely repairs minor structural partial invalidities without discarding user records.
 */
export function sanitizePartialApplicationState(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const candidate = raw as Record<string, unknown>
  if (!candidate.data || typeof candidate.data !== 'object') return raw

  const data = candidate.data as Record<string, unknown>
  let didModify = false
  const sanitizedData: Record<string, unknown> = { ...data }

  // Array backfills
  const arrayKeys = ['topics', 'adts', 'algorithms', 'cpProblems', 'tasks', 'brainDumpNotes', 'studySessions', 'revisions']
  for (const k of arrayKeys) {
    if (!Array.isArray(sanitizedData[k])) {
      sanitizedData[k] = []
      didModify = true
    }
  }

  // Settings defaults
  if (!sanitizedData.settings || typeof sanitizedData.settings !== 'object') {
    sanitizedData.settings = {
      examDate: '2026-11-03',
      examTitle: 'DSA End-Semester Examination',
      targetDailyStudyMinutes: 180,
      theme: 'light',
      spacedRepetitionIntervalsDays: [1, 3, 7, 14, 30],
      initialisedAt: getCurrentIsoTimestamp(),
      academicDataSeededAt: getCurrentIsoTimestamp(),
    }
    didModify = true
  } else {
    const s = sanitizedData.settings as Record<string, unknown>
    if (!Array.isArray(s.spacedRepetitionIntervalsDays)) {
      s.spacedRepetitionIntervalsDays = [1, 3, 7, 14, 30]
      didModify = true
    }
  }

  if (didModify) {
    return {
      ...candidate,
      data: sanitizedData,
    }
  }

  return raw
}

/**
 * Migrates a raw persisted state object to the current schema version.
 */
export function migrateState(rawState: unknown): MigrationResult {
  if (!rawState || typeof rawState !== 'object') {
    throw new StorageError(
      'Cannot migrate invalid or null state',
      'MALFORMED_DATA'
    )
  }

  const sanitizedState = sanitizePartialApplicationState(rawState)
  const candidate = sanitizedState as Record<string, unknown>
  const incomingVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 0

  if (incomingVersion > CURRENT_SCHEMA_VERSION) {
    throw new StorageError(
      `Persisted state schema version (${incomingVersion}) is newer than supported version (${CURRENT_SCHEMA_VERSION}). Please update the application.`,
      'VERSION_MISMATCH'
    )
  }

  if (incomingVersion === CURRENT_SCHEMA_VERSION) {
    // Already current - validate directly
    const validation = validateCompleteApplicationState(sanitizedState)
    if (!validation.isValid) {
      throw new StorageError(
        `Current schema v${CURRENT_SCHEMA_VERSION} failed validation: ${validation.errors.join('; ')}`,
        'VALIDATION_FAILED'
      )
    }
    return {
      migrated: sanitizedState !== rawState,
      state: sanitizedState as VersionedApplicationState,
      fromVersion: CURRENT_SCHEMA_VERSION,
      toVersion: CURRENT_SCHEMA_VERSION,
    }
  }

  // Sequentially migrate
  let currentState: unknown = sanitizedState
  let currentVersion = incomingVersion

  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[currentVersion]
    if (!migration) {
      throw new StorageError(
        `Missing migration path from v${currentVersion} to v${currentVersion + 1}`,
        'VERSION_MISMATCH'
      )
    }

    currentState = migration(currentState)
    currentVersion += 1
  }

  const finalValidation = validateCompleteApplicationState(currentState)
  if (!finalValidation.isValid) {
    throw new StorageError(
      `Migrated state failed validation: ${finalValidation.errors.join('; ')}`,
      'VALIDATION_FAILED'
    )
  }

  return {
    migrated: true,
    state: currentState as VersionedApplicationState,
    fromVersion: incomingVersion,
    toVersion: CURRENT_SCHEMA_VERSION,
  }
}

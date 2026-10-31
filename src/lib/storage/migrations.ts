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

  const candidate = rawState as Record<string, unknown>
  const incomingVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 0

  if (incomingVersion > CURRENT_SCHEMA_VERSION) {
    throw new StorageError(
      `Persisted state schema version (${incomingVersion}) is newer than supported version (${CURRENT_SCHEMA_VERSION}). Please update the application.`,
      'VERSION_MISMATCH'
    )
  }

  if (incomingVersion === CURRENT_SCHEMA_VERSION) {
    // Already current - validate directly
    const validation = validateCompleteApplicationState(rawState)
    if (!validation.isValid) {
      throw new StorageError(
        `Current schema v${CURRENT_SCHEMA_VERSION} failed validation: ${validation.errors.join('; ')}`,
        'VALIDATION_FAILED'
      )
    }
    return {
      migrated: false,
      state: rawState as VersionedApplicationState,
      fromVersion: CURRENT_SCHEMA_VERSION,
      toVersion: CURRENT_SCHEMA_VERSION,
    }
  }

  // Sequentially migrate
  let currentState: unknown = rawState
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

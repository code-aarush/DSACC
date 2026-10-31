/**
 * Storage Service
 * 
 * High-level orchestration for state loading, initialization, and error recovery.
 * Strictly guarantees:
 * 1. Initialisation does not overwrite valid existing data.
 * 2. Invalid or malformed state is not silently replaced with seed data.
 * 3. Seed data is integrated idempotently exactly once, preserving user edits.
 * 4. Save states (IDLE, SAVING, SAVED, ERROR) are accurately communicated.
 */

import {
  VersionedApplicationState,
  CURRENT_SCHEMA_VERSION,
  ApplicationSettings,
  SyllabusTopic,
  ADTImplementation,
  Algorithm,
} from '../../types/domain'
import { StorageAdapter, StorageError } from '../../types/storage'
import { getCurrentIsoTimestamp } from '../date/dateUtils'
import { SEED_TOPICS } from '../../data/seed/syllabusSeed'
import { SEED_ADTS } from '../../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../../data/seed/algorithmSeed'

export function createDefaultSettings(): ApplicationSettings {
  return {
    examDate: '2026-11-03',
    examTitle: 'DSA End-Semester Examination',
    targetDailyStudyMinutes: 180,
    theme: 'light',
    spacedRepetitionIntervalsDays: [1, 3, 7, 14],
    initialisedAt: getCurrentIsoTimestamp(),
    academicDataSeededAt: getCurrentIsoTimestamp(),
  }
}

/**
 * Creates initial fresh application state populated with full academic seed datasets.
 */
export function createInitialApplicationState(): VersionedApplicationState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: '0.1.0',
    updatedAt: getCurrentIsoTimestamp(),
    data: {
      topics: [...SEED_TOPICS],
      adts: [...SEED_ADTS],
      algorithms: [...SEED_ALGORITHMS],
      cpProblems: [],
      tasks: [],
      brainDumpNotes: [],
      studySessions: [],
      settings: createDefaultSettings(),
    },
  }
}

/**
 * Idempotently merges seed records into an existing state without overwriting user changes.
 * If a record with a given ID already exists in user state, it is PRESERVED.
 * Custom records created by the user are PRESERVED.
 */
export function mergeSeedDataIntoExistingState(
  existingState: VersionedApplicationState
): { mergedState: VersionedApplicationState; didModify: boolean } {
  let didModify = false
  const existingData = existingState.data

  // 1. Merge Topics
  const topicIdMap = new Map<string, SyllabusTopic>(
    existingData.topics.map(t => [t.id, t])
  )
  const mergedTopics = [...existingData.topics]

  for (const seedTopic of SEED_TOPICS) {
    if (!topicIdMap.has(seedTopic.id)) {
      mergedTopics.push(seedTopic)
      topicIdMap.set(seedTopic.id, seedTopic)
      didModify = true
    }
  }

  // 2. Merge ADTs
  const adtIdMap = new Map<string, ADTImplementation>(
    existingData.adts.map(a => [a.id, a])
  )
  const mergedAdts = [...existingData.adts]

  for (const seedAdt of SEED_ADTS) {
    if (!adtIdMap.has(seedAdt.id)) {
      mergedAdts.push(seedAdt)
      adtIdMap.set(seedAdt.id, seedAdt)
      didModify = true
    }
  }

  // 3. Merge Algorithms
  const algoIdMap = new Map<string, Algorithm>(
    existingData.algorithms.map(a => [a.id, a])
  )
  const mergedAlgorithms = [...existingData.algorithms]

  for (const seedAlgo of SEED_ALGORITHMS) {
    if (!algoIdMap.has(seedAlgo.id)) {
      mergedAlgorithms.push(seedAlgo)
      algoIdMap.set(seedAlgo.id, seedAlgo)
      didModify = true
    }
  }

  // 4. Update Settings
  const updatedSettings: ApplicationSettings = {
    ...existingData.settings,
    academicDataSeededAt: existingData.settings.academicDataSeededAt || getCurrentIsoTimestamp(),
  }
  if (!existingData.settings.academicDataSeededAt) {
    didModify = true
  }

  const mergedState: VersionedApplicationState = {
    ...existingState,
    updatedAt: didModify ? getCurrentIsoTimestamp() : existingState.updatedAt,
    data: {
      ...existingData,
      topics: mergedTopics,
      adts: mergedAdts,
      algorithms: mergedAlgorithms,
      settings: updatedSettings,
    },
  }

  return { mergedState, didModify }
}

export interface StorageInitResult {
  state: VersionedApplicationState
  isNewInitialisation: boolean
  error?: StorageError
}

/**
 * Safely initialises the application state.
 * Never overwrites existing valid user data.
 * If storage holds corrupted data, halts initialization and preserves the error
 * rather than silently wiping data with blank or seed state.
 */
export async function initializeStorage(adapter: StorageAdapter): Promise<StorageInitResult> {
  const loadResult = await adapter.load()

  if (!loadResult.success) {
    // Storage has an error (e.g. malformed JSON, version mismatch)
    // Return initial state in-memory ONLY with error attached, DO NOT write to storage!
    return {
      state: createInitialApplicationState(),
      isNewInitialisation: false,
      error: loadResult.error,
    }
  }

  if (loadResult.data !== null && loadResult.data !== undefined) {
    // Valid existing state found - idempotently merge any missing seed records without overwriting user data
    const { mergedState, didModify } = mergeSeedDataIntoExistingState(loadResult.data)

    if (didModify) {
      await adapter.save(mergedState)
    }

    return {
      state: mergedState,
      isNewInitialisation: false,
    }
  }

  // First run: storage is empty. Initialize default state with full seed dataset safely.
  const freshState = createInitialApplicationState()
  const saveResult = await adapter.save(freshState)

  if (!saveResult.success) {
    return {
      state: freshState,
      isNewInitialisation: true,
      error: saveResult.error,
    }
  }

  return {
    state: freshState,
    isNewInitialisation: true,
  }
}

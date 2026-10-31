import { describe, it, expect, beforeEach } from 'vitest'
import {
  LocalStorageAdapter,
  PRIMARY_STORAGE_KEY,
  SAFETY_BACKUP_KEY,
  CORRUPTED_BACKUP_KEY,
} from '../lib/storage/localStorageAdapter'
import { initializeStorage, createInitialApplicationState } from '../lib/storage/storageService'
import { VersionedApplicationState, CURRENT_SCHEMA_VERSION } from '../types/domain'

describe('Persistence and Storage Foundation Tests', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    window.localStorage.clear()
    adapter = new LocalStorageAdapter()
  })

  it('persists and retrieves a valid application-state envelope', async () => {
    const freshState = createInitialApplicationState()
    const saveResult = await adapter.save(freshState)
    expect(saveResult.success).toBe(true)

    const loadResult = await adapter.load()
    expect(loadResult.success).toBe(true)
    expect(loadResult.data).toBeDefined()
    expect(loadResult.data?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(loadResult.data?.data.settings.examTitle).toBe('DSA End-Semester Examination')
  })

  it('initialization does NOT overwrite existing valid user data', async () => {
    // 1. Create and save an existing user state with modified settings
    const existingState = createInitialApplicationState()
    existingState.data.settings.examTitle = 'User Custom Midterm DSA Exam'
    existingState.data.settings.targetDailyStudyMinutes = 240
    await adapter.save(existingState)

    // 2. Run initialization
    const initResult = await initializeStorage(adapter)
    expect(initResult.isNewInitialisation).toBe(false)
    expect(initResult.state.data.settings.examTitle).toBe('User Custom Midterm DSA Exam')
    expect(initResult.state.data.settings.targetDailyStudyMinutes).toBe(240)

    // 3. Verify storage was NOT overwritten with default title
    const reloaded = await adapter.load()
    expect(reloaded.data?.data.settings.examTitle).toBe('User Custom Midterm DSA Exam')
  })

  it('malformed JSON is rejected, quarantined, and NOT silently replaced with seed data', async () => {
    // Store corrupted JSON string in localStorage
    const corruptedString = '{ "schemaVersion": 1, "corrupted": true, broken json...'
    window.localStorage.setItem(PRIMARY_STORAGE_KEY, corruptedString)

    // Attempt to load
    const loadResult = await adapter.load()
    expect(loadResult.success).toBe(false)
    expect(loadResult.error?.code).toBe('MALFORMED_DATA')

    // Verify corrupted data was quarantined rather than wiped
    const keys = Object.keys(window.localStorage)
    const hasQuarantine = keys.some(k => k.startsWith(CORRUPTED_BACKUP_KEY))
    expect(hasQuarantine).toBe(true)

    // Verify initializeStorage reports the error rather than overwriting the raw data
    const initResult = await initializeStorage(adapter)
    expect(initResult.error).toBeDefined()
    expect(initResult.error?.code).toBe('MALFORMED_DATA')
    // Raw corrupted data should still remain in storage key for recovery
    expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBe(corruptedString)
  })

  it('rejects an incompatible newer schema version safely without modifying it', async () => {
    const futureState = {
      schemaVersion: 999,
      appVersion: '99.0.0',
      updatedAt: new Date().toISOString(),
      data: {
        topics: [],
        adts: [],
        algorithms: [],
        cpProblems: [],
        tasks: [],
        brainDumpNotes: [],
        studySessions: [],
        settings: {
          examDate: '2026-11-03',
          examTitle: 'Future Exam',
          targetDailyStudyMinutes: 120,
          theme: 'light',
          spacedRepetitionIntervalsDays: [1, 3],
          initialisedAt: new Date().toISOString(),
        },
      },
    }
    window.localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(futureState))

    const loadResult = await adapter.load()
    expect(loadResult.success).toBe(false)
    expect(loadResult.error?.code).toBe('VERSION_MISMATCH')
    expect(loadResult.error?.message).toContain('newer than supported version')
  })

  it('clear() creates a safety backup before removing data', async () => {
    const state = createInitialApplicationState()
    await adapter.save(state)

    const clearResult = await adapter.clear()
    expect(clearResult.success).toBe(true)
    expect(window.localStorage.getItem(PRIMARY_STORAGE_KEY)).toBeNull()

    // Safety backup must exist
    const keys = Object.keys(window.localStorage)
    const hasSafetyBackup = keys.some(k => k.startsWith(SAFETY_BACKUP_KEY))
    expect(hasSafetyBackup).toBe(true)
  })

  it('serializes concurrent write calls correctly without race conditions', async () => {
    const state1 = createInitialApplicationState()
    state1.data.settings.targetDailyStudyMinutes = 60

    const state2: VersionedApplicationState = {
      ...state1,
      data: {
        ...state1.data,
        settings: {
          ...state1.data.settings,
          targetDailyStudyMinutes: 120,
        },
      },
    }

    const state3: VersionedApplicationState = {
      ...state1,
      data: {
        ...state1.data,
        settings: {
          ...state1.data.settings,
          targetDailyStudyMinutes: 180,
        },
      },
    }

    // Fire saves concurrently
    const [r1, r2, r3] = await Promise.all([
      adapter.save(state1),
      adapter.save(state2),
      adapter.save(state3),
    ])

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)

    // Final state must reflect the final queued write (180 minutes)
    const finalLoaded = await adapter.load()
    expect(finalLoaded.data?.data.settings.targetDailyStudyMinutes).toBe(180)
  })
})

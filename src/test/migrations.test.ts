import { describe, it, expect } from 'vitest'
import { migrateState } from '../lib/storage/migrations'
import { CURRENT_SCHEMA_VERSION } from '../types/domain'
import { createInitialApplicationState } from '../lib/storage/storageService'

describe('Schema Migration Pipeline Tests', () => {
  it('passes through current schema v1 without mutation', () => {
    const state = createInitialApplicationState()
    const result = migrateState(state)

    expect(result.migrated).toBe(false)
    expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state).toBe(state)
  })

  it('migrates unversioned legacy (v0) payload to v1 while preserving records', () => {
    const legacyPayload = {
      topics: [
        {
          id: 'topic-legacy-01',
          unit: 'UNIT_I',
          chapter: 'Recursion',
          title: 'Linear Recursion',
          description: 'Single self-call structure',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'COMPLETED',
          confidence: 4,
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: true },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      examDate: '2026-11-03',
      examTitle: 'Legacy Exam Title',
    }

    const result = migrateState(legacyPayload)

    expect(result.migrated).toBe(true)
    expect(result.fromVersion).toBe(0)
    expect(result.toVersion).toBe(1)
    expect(result.state.schemaVersion).toBe(1)
    expect(result.state.data.topics.some(t => t.id === 'topic-legacy-01')).toBe(true)
    expect(result.state.data.topics.length).toBeGreaterThanOrEqual(72)
    expect(result.state.data.settings.examTitle).toBe('Legacy Exam Title')
  })

  it('throws typed VERSION_MISMATCH if state schema is newer than supported', () => {
    const futureState = {
      schemaVersion: 10,
      appVersion: '10.0.0',
      updatedAt: new Date().toISOString(),
      data: {},
    }

    expect(() => migrateState(futureState)).toThrowError(/newer than supported version/)
  })

  it('throws typed MALFORMED_DATA if rawState is null or invalid', () => {
    expect(() => migrateState(null)).toThrowError(/Cannot migrate invalid or null state/)
    expect(() => migrateState('not-an-object')).toThrowError(/Cannot migrate invalid or null state/)
  })
})

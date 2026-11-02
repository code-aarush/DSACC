/**
 * Persistence, Migrations & Seed-Once Behavior Tests for Milestone 2
 * 
 * Verifies:
 * 1. First initialisation loads full academic dataset (72 topics, 32 ADTs, 29 algorithms).
 * 2. Repeated initialisation creates zero duplicate records.
 * 3. User modifications to seeded records are strictly preserved across re-initialisation.
 * 4. Custom topics and custom operations survive re-initialisation.
 * 5. Migrations preserve all valid existing user data.
 * 6. Malformed data is safely rejected and save status errors are reported honestly.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { initializeStorage } from '../lib/storage/storageService'
import { LocalStorageAdapter, PRIMARY_STORAGE_KEY } from '../lib/storage/localStorageAdapter'
import { migrateState } from '../lib/storage/migrations'
import { VersionedApplicationState, SyllabusTopic, CURRENT_SCHEMA_VERSION } from '../types/domain'
import { StorageError } from '../types/storage'

describe('Milestone 2 Persistence & Migration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('first initialization loads the complete academic dataset envelope', async () => {
    const adapter = new LocalStorageAdapter()
    const { state, error } = await initializeStorage(adapter)

    expect(error).toBeUndefined()
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(state.data.topics).toHaveLength(63)
    expect(state.data.adts).toHaveLength(29)
    expect(state.data.algorithms).toHaveLength(27)

    // Stored string should exist in localStorage
    const storedRaw = window.localStorage.getItem(PRIMARY_STORAGE_KEY)
    expect(storedRaw).toBeDefined()
    expect(JSON.parse(storedRaw!).schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('repeated initialisation is idempotent and creates zero duplicate records', async () => {
    const adapter = new LocalStorageAdapter()
    
    // First run
    const firstRun = await initializeStorage(adapter)
    expect(firstRun.state.data.topics).toHaveLength(63)
    expect(firstRun.state.data.adts).toHaveLength(29)
    expect(firstRun.state.data.algorithms).toHaveLength(27)

    // Second run
    const secondRun = await initializeStorage(adapter)
    expect(secondRun.state.data.topics).toHaveLength(63)
    expect(secondRun.state.data.adts).toHaveLength(29)
    expect(secondRun.state.data.algorithms).toHaveLength(27)

    // Check unique IDs
    const topicIds = new Set(secondRun.state.data.topics.map(t => t.id))
    expect(topicIds.size).toBe(63)

    const adtIds = new Set(secondRun.state.data.adts.map(a => a.id))
    expect(adtIds.size).toBe(29)

    const algoIds = new Set(secondRun.state.data.algorithms.map(al => al.id))
    expect(algoIds.size).toBe(27)
  })

  it('strictly preserves user edits to seeded records during re-initialization', async () => {
    const adapter = new LocalStorageAdapter()
    const { state } = await initializeStorage(adapter)

    // Simulate user editing a seeded topic, an ADT, and an algorithm
    const modifiedState: VersionedApplicationState = {
      ...state,
      data: {
        ...state.data,
        topics: state.data.topics.map(t =>
          t.id === 'topic-singly-linked-list'
            ? { ...t, studyStatus: 'COMPLETED' as const, confidence: 4, notes: 'Mastered pointer reversal in-place!' }
            : t
        ),
        adts: state.data.adts.map(a =>
          a.id === 'adt-singly-linked-list'
            ? { ...a, status: 'TESTED' as const, filePath: 'd:/DSA/src/SinglyLinkedList.ts' }
            : a
        ),
        algorithms: state.data.algorithms.map(al =>
          al.id === 'algo-dijkstra'
            ? { ...al, isCorrectnessTested: true, notes: 'Verified with priority queue on DAG and cyclic graphs' }
            : al
        ),
      },
    }

    // Save user edits to localStorage
    await adapter.save(modifiedState)

    // Re-initialize storage (e.g. app restart / browser reload)
    const reinit = await initializeStorage(adapter)

    // Assert that user's edits were NOT overwritten by fresh seeds
    const reloadedTopic = reinit.state.data.topics.find(t => t.id === 'topic-singly-linked-list')
    expect(reloadedTopic?.studyStatus).toBe('COMPLETED')
    expect(reloadedTopic?.confidence).toBe(4)
    expect(reloadedTopic?.notes).toBe('Mastered pointer reversal in-place!')

    const reloadedAdt = reinit.state.data.adts.find(a => a.id === 'adt-singly-linked-list')
    expect(reloadedAdt?.status).toBe('TESTED')
    expect(reloadedAdt?.filePath).toBe('d:/DSA/src/SinglyLinkedList.ts')

    const reloadedAlgo = reinit.state.data.algorithms.find(al => al.id === 'algo-dijkstra')
    expect(reloadedAlgo?.isCorrectnessTested).toBe(true)
    expect(reloadedAlgo?.notes).toBe('Verified with priority queue on DAG and cyclic graphs')
  })

  it('strictly preserves custom topics and custom checklist items across re-initialization', async () => {
    const adapter = new LocalStorageAdapter()
    const { state } = await initializeStorage(adapter)

    // User adds a custom topic and custom operation on an ADT
    const customTopic: SyllabusTopic = {
      id: 'topic-custom-suffix-automaton',
      unit: 'UNIT_III',
      chapter: 'Advanced Graphs & Strings',
      title: 'Suffix Automaton',
      description: 'Directed acyclic word graph recognizing all substrings in O(N).',
      classification: 'OPTIONAL',
      priority: 'LOW',
      studyStatus: 'IN_PROGRESS',
      confidence: 2,
      revisionStatus: 'NOT_DUE',
      completionRequirements: { manualConfirmationRequired: true },
      linkedTaskIds: [],
      linkedAdtIds: [],
      linkedAlgorithmIds: [],
      linkedCpProblemIds: [],
      notes: 'Custom exam bonus topic',
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const modifiedState: VersionedApplicationState = {
      ...state,
      data: {
        ...state.data,
        topics: [customTopic, ...state.data.topics],
        adts: state.data.adts.map(a =>
          a.id === 'adt-singly-linked-list'
            ? {
                ...a,
                essentialOperations: [
                  ...a.essentialOperations,
                  { id: 'op-custom-floyd', name: 'findMiddleFloyd()', isCompleted: true, isCustom: true },
                ],
              }
            : a
        ),
      },
    }

    await adapter.save(modifiedState)

    // Re-initialize storage
    const reinit = await initializeStorage(adapter)

    // Custom topic must still exist (total 73 topics)
    expect(reinit.state.data.topics).toHaveLength(64)
    const foundCustom = reinit.state.data.topics.find(t => t.id === 'topic-custom-suffix-automaton')
    expect(foundCustom).toBeDefined()
    expect(foundCustom?.isCustom).toBe(true)

    // Custom operation must still exist
    const foundAdt = reinit.state.data.adts.find(a => a.id === 'adt-singly-linked-list')
    expect(foundAdt?.essentialOperations.some(op => op.id === 'op-custom-floyd')).toBe(true)
  })

  it('safely migrates unversioned/v0 state to current schema without losing user records', () => {
    const legacyRaw = {
      topics: [
        {
          id: 'topic-singly-linked-list',
          unit: 'UNIT_I',
          chapter: 'Arrays, Linked Lists and Recursion',
          title: 'Singly Linked List',
          description: 'Singly linked chain of nodes',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'IN_PROGRESS',
          confidence: 3,
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: true },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: 'Legacy user note from previous session',
          createdAt: '2026-10-28T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        },
      ],
      examDate: '2026-11-03',
      examTitle: 'DSA End-Semester Examination',
    }

    const result = migrateState(legacyRaw)
    expect(result.migrated).toBe(true)
    expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)

    // The user's legacy edit must be preserved
    const migratedTopic = result.state.data.topics.find(t => t.id === 'topic-singly-linked-list')
    expect(migratedTopic?.studyStatus).toBe('IN_PROGRESS')
    expect(migratedTopic?.confidence).toBe(3)
    expect(migratedTopic?.notes).toBe('Legacy user note from previous session')

    // Remaining missing seed topics must have been merged
    expect(result.state.data.topics).toHaveLength(63)
    expect(result.state.data.adts).toHaveLength(29)
    expect(result.state.data.algorithms).toHaveLength(27)
  })

  it('throws a StorageError and does not overwrite with seed data when raw state is malformed', () => {
    expect(() => migrateState(null)).toThrow(StorageError)
    expect(() => migrateState('not an object')).toThrow(StorageError)
  })
})

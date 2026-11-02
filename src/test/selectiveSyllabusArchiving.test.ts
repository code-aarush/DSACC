import { describe, it, expect } from 'vitest'
import { SEED_TOPICS } from '../data/seed/syllabusSeed'
import { SEED_ADTS } from '../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../data/seed/algorithmSeed'
import { calculateSyllabusProgress } from '../lib/progress/progressCalculators'
import { getWeakTopics } from '../lib/progress/taskAndCpCalculators'
import { identifyWeakAreas } from '../lib/revision/weakAreaAnalytics'
import { migrateState } from '../lib/storage/migrations'
import { initializeStorage } from '../lib/storage/storageService'
import { EXCLUDED_SYLLABUS_TOPIC_IDS, isSyllabusTopicExcluded } from '../lib/archive/archiveConstants'
import { StorageAdapter, StorageResult, StorageError } from '../types/storage'
import { VersionedApplicationState } from '../types/domain'

class InMemoryStorageAdapter implements StorageAdapter {
  private data: string | null = null

  constructor(initialData?: string | null) {
    if (initialData !== undefined) {
      this.data = initialData
    }
  }

  async load(): Promise<StorageResult<VersionedApplicationState | null>> {
    if (!this.data) return { success: true, data: null }
    try {
      const parsed = JSON.parse(this.data)
      const migrationResult = migrateState(parsed)
      return { success: true, data: migrationResult.state }
    } catch (err) {
      const storageError = err instanceof StorageError ? err : new StorageError(String(err), 'UNKNOWN')
      return { success: false, error: storageError }
    }
  }

  async save(state: VersionedApplicationState): Promise<StorageResult<void>> {
    this.data = JSON.stringify(state)
    return { success: true, data: undefined }
  }

  async clear(): Promise<StorageResult<void>> {
    this.data = null
    return { success: true, data: undefined }
  }

  getRaw(): string | null {
    return this.data
  }
}

describe('Selective Syllabus Archiving Tests', () => {
  it('1. verifies every specified topic is archived in seed data with stable IDs', () => {
    const topicMap = new Map(SEED_TOPICS.map(t => [t.id, t]))

    for (const id of EXCLUDED_SYLLABUS_TOPIC_IDS) {
      const topic = topicMap.get(id)
      expect(topic, `Topic ${id} must exist in seed data`).toBeDefined()
      expect(topic?.isArchived, `Topic ${id} must have isArchived: true`).toBe(true)
      expect(topic?.archivedAt, `Topic ${id} must have an archivedAt timestamp`).toBeTruthy()
    }

    expect(EXCLUDED_SYLLABUS_TOPIC_IDS.length).toBe(9)
  })

  it('2. explicitly preserves surrounding curriculum including DAGs, BFS, DFS, Dijkstra, Prim, Kruskal', () => {
    const topicMap = new Map(SEED_TOPICS.map(t => [t.id, t]))

    // DAGs syllabus topic must NOT be archived
    const dagTopic = topicMap.get('topic-dag')
    expect(dagTopic).toBeDefined()
    expect(dagTopic?.title).toBe('Directed Acyclic Graphs')
    expect(dagTopic?.isArchived).toBeFalsy()
    expect(isSyllabusTopicExcluded(dagTopic!)).toBe(false)

    // Other core graph topics must be active
    const weightedGraphs = topicMap.get('topic-weighted-graphs')
    expect(weightedGraphs?.isArchived).toBeFalsy()

    const shortestPaths = topicMap.get('topic-shortest-paths')
    expect(shortestPaths?.isArchived).toBeFalsy()

    const mstAlgorithms = topicMap.get('topic-mst-algorithms')
    expect(mstAlgorithms?.isArchived).toBeFalsy()
  })

  it('3. does NOT delete or modify ADT Library or Algorithm Library records', () => {
    // Exact original counts
    expect(SEED_ADTS.length).toBe(32)
    expect(SEED_ALGORITHMS.length).toBe(29)

    // Check key algorithms are present and active
    const algoMap = new Map(SEED_ALGORITHMS.map(a => [a.id, a]))
    expect(algoMap.get('algo-bfs')?.name).toBe('Breadth-First Search')
    expect(algoMap.get('algo-dfs')?.name).toBe('Depth-First Search')
    expect(algoMap.get('algo-dijkstra')?.name).toBe("Dijkstra's Shortest Path Algorithm")
    expect(algoMap.get('algo-prim')?.name).toContain('Prim')
    expect(algoMap.get('algo-kruskal')?.name).toBe("Kruskal's Minimum Spanning Tree")
    expect(algoMap.get('algo-warshall')?.name).toBe("Warshall's Transitive Closure")
    expect(algoMap.get('algo-topological-sort')?.name).toBe('Topological Sorting')

    // None of the ADTs or Algorithms have isArchived modified
    for (const adt of SEED_ADTS) {
      expect(adt.isArchived).toBeUndefined()
    }
    for (const algo of SEED_ALGORITHMS) {
      expect(algo.isArchived).toBeUndefined()
    }
  })

  it('4. excludes archived topics from required progress denominators and calculations', () => {
    const summary = calculateSyllabusProgress(SEED_TOPICS)

    // Total seed topics = 72. 9 archived -> 63 active topics.
    // Originally 70 required. 8 required archived -> 62 active required topics.
    // Originally 2 optional. 1 optional archived -> 1 active optional topic.
    expect(summary.totalRequired).toBe(62)
    expect(summary.totalOptional).toBe(1)
    expect(summary.completedRequired).toBe(0)
    expect(summary.percentageRequired).toBe(0)
    expect(summary.archivedCount).toBe(9)
    expect(summary.notStartedCount).toBe(63)
  })

  it('5. restoring an archived topic reinstates it into active calculations with preserved state', () => {
    // Simulate user restoring Skip List Structure and marking it COMPLETED with confidence 4
    const modifiedTopics = SEED_TOPICS.map(t =>
      t.id === 'topic-skip-list-struct'
        ? { ...t, isArchived: false, studyStatus: 'COMPLETED' as const, confidence: 4 as const }
        : t
    )

    const summary = calculateSyllabusProgress(modifiedTopics)

    // Restored required topic increases required denominator from 62 to 63
    expect(summary.totalRequired).toBe(63)
    expect(summary.completedRequired).toBe(1)
    expect(summary.percentageRequired).toBe(Math.round((1 / 63) * 100)) // 2%
    expect(summary.archivedCount).toBe(8)
  })

  it('6. safely migrates existing persisted v2 state from dsacc.vercel.app to v3, preserving user progress', () => {
    const v2PersistedState = {
      schemaVersion: 2,
      appVersion: '0.1.0',
      updatedAt: '2026-10-31T12:00:00.000Z',
      data: {
        topics: [
          {
            id: 'topic-b-trees',
            unit: 'UNIT_III',
            chapter: 'Search Trees',
            title: 'B-Trees',
            description: 'Multiway search trees',
            classification: 'REQUIRED',
            priority: 'HIGH',
            studyStatus: 'IN_PROGRESS',
            confidence: 2,
            revisionStatus: 'NOT_DUE',
            completionRequirements: { manualConfirmationRequired: true },
            linkedTaskIds: ['task-study-btree'],
            linkedAdtIds: ['adt-b-tree'],
            linkedAlgorithmIds: [],
            linkedCpProblemIds: [],
            notes: 'User had custom notes on B-Tree node split order',
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
          {
            id: 'topic-dag',
            unit: 'UNIT_III',
            chapter: 'Graphs',
            title: 'Directed Acyclic Graphs',
            description: 'DAG structural properties',
            classification: 'REQUIRED',
            priority: 'HIGH',
            studyStatus: 'COMPLETED',
            confidence: 5,
            revisionStatus: 'NOT_DUE',
            completionRequirements: { manualConfirmationRequired: true },
            linkedTaskIds: [],
            linkedAdtIds: [],
            linkedAlgorithmIds: [],
            linkedCpProblemIds: [],
            notes: 'Keep this active',
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
        ],
        adts: [],
        algorithms: [],
        cpProblems: [{ id: 'cp-01', title: 'Two Sum', isIndependentlySolved: true }],
        tasks: [{ id: 'task-01', title: 'Existing user task', status: 'TO_DO' }],
        brainDumpNotes: [{ id: 'note-01', body: 'Existing user doubt', type: 'DOUBT', isResolved: false }],
        studySessions: [],
        revisions: [],
        settings: {
          examDate: '2026-11-03',
          examTitle: 'DSA End-Semester Examination',
          targetDailyStudyMinutes: 180,
          theme: 'light',
          spacedRepetitionIntervalsDays: [1, 3, 7, 14, 30],
          initialisedAt: '2026-10-15T00:00:00.000Z',
          academicDataSeededAt: '2026-10-15T00:00:00.000Z',
        },
      },
    }

    const migrationResult = migrateState(v2PersistedState)
    expect(migrationResult.migrated).toBe(true)
    expect(migrationResult.toVersion).toBe(3)
    expect(migrationResult.state.schemaVersion).toBe(3)

    // B-Trees is archived but ALL user data is intact
    const bTreeTopic = migrationResult.state.data.topics.find(t => t.id === 'topic-b-trees')
    expect(bTreeTopic?.isArchived).toBe(true)
    expect(bTreeTopic?.studyStatus).toBe('IN_PROGRESS') // PRESERVED
    expect(bTreeTopic?.confidence).toBe(2) // PRESERVED
    expect(bTreeTopic?.notes).toBe('User had custom notes on B-Tree node split order') // PRESERVED
    expect(bTreeTopic?.linkedTaskIds).toEqual(['task-study-btree']) // PRESERVED

    // DAG remains active
    const dagTopic = migrationResult.state.data.topics.find(t => t.id === 'topic-dag')
    expect(dagTopic?.isArchived).toBeUndefined()
    expect(dagTopic?.studyStatus).toBe('COMPLETED')

    // Connected data is completely untouched
    expect(migrationResult.state.data.cpProblems[0].id).toBe('cp-01')
    expect(migrationResult.state.data.tasks[0].id).toBe('task-01')
    expect(migrationResult.state.data.brainDumpNotes[0].id).toBe('note-01')
  })

  it('7. repeated initialization is idempotent and does not resurrect or duplicate records', async () => {
    const adapter = new InMemoryStorageAdapter()
    const firstInit = await initializeStorage(adapter)
    expect(firstInit.state.schemaVersion).toBe(3)

    const topicsFirst = firstInit.state.data.topics
    const archivedFirst = topicsFirst.filter(t => t.isArchived).length
    expect(archivedFirst).toBe(9)

    // Second initialization on same adapter
    const secondInit = await initializeStorage(adapter)
    const topicsSecond = secondInit.state.data.topics
    expect(topicsSecond.length).toBe(topicsFirst.length)
    expect(topicsSecond.filter(t => t.isArchived).length).toBe(9)
  })

  it('8. weak areas and weak topics filter out archived topics', () => {
    const weak = getWeakTopics(SEED_TOPICS)
    // Archived topics with confidence 1 should NOT be returned in active weak topics
    for (const t of weak) {
      expect(t.isArchived).toBeFalsy()
      expect(EXCLUDED_SYLLABUS_TOPIC_IDS).not.toContain(t.id)
    }

    const weakAreas = identifyWeakAreas(SEED_TOPICS, SEED_ADTS, SEED_ALGORITHMS, [], [], [])
    for (const wa of weakAreas) {
      if (wa.entityType === 'TOPIC') {
        expect(EXCLUDED_SYLLABUS_TOPIC_IDS).not.toContain(wa.entityId)
      }
    }
  })
})

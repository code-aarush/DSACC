import { describe, it, expect } from 'vitest'
import { SEED_TOPICS } from '../data/seed/syllabusSeed'
import { SEED_ADTS } from '../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../data/seed/algorithmSeed'
import { calculateSyllabusProgress, calculateADTProgress, calculateAlgorithmProgress } from '../lib/progress/progressCalculators'
import { migrateState } from '../lib/storage/migrations'
import { mergeBackupData } from '../lib/backup/backupService'
import {
  REMOVED_SYLLABUS_TOPIC_IDS,
  REMOVED_ADT_IDS,
  REMOVED_ALGORITHM_IDS,
  REMOVED_SYLLABUS_SET,
  REMOVED_ADT_SET,
  REMOVED_ALGORITHM_SET,
} from '../lib/catalog/removedRecords'
import { ApplicationDataPayload, Task } from '../types/domain'

describe('Permanent Catalog Removal & Reconciliation Tests', () => {
  it('1. verifies all 9 specified syllabus topics are completely absent from seed data', () => {
    const topicIdSet = new Set(SEED_TOPICS.map(t => t.id))
    for (const id of REMOVED_SYLLABUS_TOPIC_IDS) {
      expect(topicIdSet.has(id), `Topic ${id} must not exist in SEED_TOPICS`).toBe(false)
    }
  })

  it('2. verifies all 3 specified ADTs are completely absent from seed data', () => {
    const adtIdSet = new Set(SEED_ADTS.map(a => a.id))
    for (const id of REMOVED_ADT_IDS) {
      expect(adtIdSet.has(id), `ADT ${id} must not exist in SEED_ADTS`).toBe(false)
    }
  })

  it('3. verifies all 2 specified algorithms are completely absent from seed data', () => {
    const algoIdSet = new Set(SEED_ALGORITHMS.map(al => al.id))
    for (const id of REMOVED_ALGORITHM_IDS) {
      expect(algoIdSet.has(id), `Algorithm ${id} must not exist in SEED_ALGORITHMS`).toBe(false)
    }
  })

  it('4. confirms exact inventory reconciliation targets across all three catalogs', () => {
    // Syllabus: 63 records (62 required, 1 optional)
    expect(SEED_TOPICS.length).toBe(63)
    const requiredTopics = SEED_TOPICS.filter(t => t.classification === 'REQUIRED')
    const optionalTopics = SEED_TOPICS.filter(t => t.classification === 'OPTIONAL')
    expect(requiredTopics.length).toBe(62)
    expect(optionalTopics.length).toBe(1)
    expect(optionalTopics[0].id).toBe('topic-disjoint-set-adt')

    // ADTs: 29 records
    expect(SEED_ADTS.length).toBe(29)

    // Algorithms: 27 records
    expect(SEED_ALGORITHMS.length).toBe(27)
  })

  it('5. confirms surrounding curriculum and cross-references are safely preserved and cleaned', () => {
    const topicMap = new Map(SEED_TOPICS.map(t => [t.id, t]))
    const adtMap = new Map(SEED_ADTS.map(a => [a.id, a]))
    const algoMap = new Map(SEED_ALGORITHMS.map(al => [al.id, al]))

    // DAG topic preserved
    const dag = topicMap.get('topic-dag')
    expect(dag).toBeDefined()
    expect(dag?.title).toBe('Directed Acyclic Graphs')
    expect(dag?.completionRequirements.manualConfirmationRequired).toBe(true)
    expect(dag?.linkedAlgorithmIds).toEqual([])

    // External searching topic cleaned
    const extSearch = topicMap.get('topic-ext-searching')
    expect(extSearch).toBeDefined()
    expect(extSearch?.linkedAdtIds).toEqual([])

    // Adjacency list cleaned
    const adjList = adtMap.get('adt-adjacency-list')
    expect(adjList).toBeDefined()
    expect(adjList?.linkedAlgorithmIds).toEqual(['algo-bfs', 'algo-dfs'])

    // Adjacency matrix cleaned
    const adjMatrix = adtMap.get('adt-adjacency-matrix')
    expect(adjMatrix).toBeDefined()
    expect(adjMatrix?.linkedAlgorithmIds).toEqual([])
    expect(adjMatrix?.relatedSyllabusTopicIds).not.toContain('topic-transitive-closure')

    // Core graph algorithms intact
    expect(algoMap.has('algo-bfs')).toBe(true)
    expect(algoMap.has('algo-dfs')).toBe(true)
    expect(algoMap.has('algo-dijkstra')).toBe(true)
    expect(algoMap.has('algo-prim')).toBe(true)
    expect(algoMap.has('algo-kruskal')).toBe(true)
  })

  it('6. verifies progress calculations derive strictly from remaining records', () => {
    // Syllabus progress
    const syllabusProgress = calculateSyllabusProgress(SEED_TOPICS)
    expect(syllabusProgress.totalRequired).toBe(62)
    expect(syllabusProgress.totalOptional).toBe(1)
    expect(syllabusProgress.completedRequired).toBe(0)
    expect(syllabusProgress.percentageRequired).toBe(0)

    // ADT progress
    const adtProgress = calculateADTProgress(SEED_ADTS)
    expect(adtProgress.total).toBe(29)
    expect(adtProgress.percentageTestedOrMastered).toBe(0)

    // Algorithm progress
    const algoProgress = calculateAlgorithmProgress(SEED_ALGORITHMS)
    expect(algoProgress.totalRequired).toBe(27)
    expect(algoProgress.percentageImplemented).toBe(0)
    expect(algoProgress.percentageTested).toBe(0)
  })

  it('7. migrates persisted v2 state to v4 removing selected records while preserving user data', () => {
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
            completionRequirements: { manualConfirmationRequired: false, requiredAlgorithmIds: ['algo-topological-sort'] },
            linkedTaskIds: [],
            linkedAdtIds: [],
            linkedAlgorithmIds: ['algo-topological-sort'],
            linkedCpProblemIds: [],
            notes: 'Keep this active',
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
        ],
        adts: [
          {
            id: 'adt-b-tree',
            name: 'B-Tree',
            category: 'ADVANCED',
            relatedSyllabusTopicIds: ['topic-b-trees'],
            status: 'IN_PROGRESS',
            essentialOperations: [],
            edgeCasesVerified: [],
            complexityNotes: '',
            linkedTaskIds: [],
            linkedAlgorithmIds: [],
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
          {
            id: 'adt-adjacency-list',
            name: 'Adjacency List',
            category: 'GRAPH_REPRESENTATIONS',
            relatedSyllabusTopicIds: ['topic-graph-adt'],
            status: 'NOT_STARTED',
            essentialOperations: [],
            edgeCasesVerified: [],
            complexityNotes: '',
            linkedTaskIds: [],
            linkedAlgorithmIds: ['algo-bfs', 'algo-dfs', 'algo-topological-sort'],
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
        ],
        algorithms: [
          {
            id: 'algo-topological-sort',
            name: 'Topological Sorting',
            category: 'GRAPH_ALGORITHMS',
            classification: 'REQUIRED',
            relatedSyllabusTopicIds: ['topic-dag'],
            relatedAdtIds: ['adt-adjacency-list'],
            status: 'NOT_STARTED',
            isCorrectnessTested: false,
            isSampleTraceCompleted: false,
            timeComplexity: 'O(V + E)',
            auxiliarySpaceComplexity: 'O(V)',
            preconditions: '',
            commonMistakesAndNotes: '',
            linkedCpProblemIds: [],
            linkedTaskIds: [],
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
          {
            id: 'algo-bfs',
            name: 'Breadth-First Search',
            category: 'GRAPH_ALGORITHMS',
            classification: 'REQUIRED',
            relatedSyllabusTopicIds: ['topic-graph-traversal'],
            relatedAdtIds: ['adt-adjacency-list'],
            status: 'TESTED',
            isCorrectnessTested: true,
            isSampleTraceCompleted: true,
            timeComplexity: 'O(V + E)',
            auxiliarySpaceComplexity: 'O(V)',
            preconditions: '',
            commonMistakesAndNotes: '',
            linkedCpProblemIds: [],
            linkedTaskIds: [],
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-25T00:00:00.000Z',
          },
        ],
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
    expect(migrationResult.state.schemaVersion).toBe(4)

    // Removed items are completely gone
    const topicIds = migrationResult.state.data.topics.map(t => t.id)
    const adtIds = migrationResult.state.data.adts.map(a => a.id)
    const algoIds = migrationResult.state.data.algorithms.map(al => al.id)

    expect(topicIds).not.toContain('topic-b-trees')
    expect(adtIds).not.toContain('adt-b-tree')
    expect(algoIds).not.toContain('algo-topological-sort')

    // Surviving items preserved with user data
    expect(topicIds).toContain('topic-dag')
    const dagTopic = migrationResult.state.data.topics.find(t => t.id === 'topic-dag')
    expect(dagTopic?.studyStatus).toBe('COMPLETED')
    expect(dagTopic?.confidence).toBe(5)
    expect(dagTopic?.notes).toBe('Keep this active')
    expect(dagTopic?.completionRequirements.manualConfirmationRequired).toBe(true)
    expect(dagTopic?.linkedAlgorithmIds).toEqual([])

    expect(adtIds).toContain('adt-adjacency-list')
    const adjList = migrationResult.state.data.adts.find(a => a.id === 'adt-adjacency-list')
    expect(adjList?.linkedAlgorithmIds).toEqual(['algo-bfs', 'algo-dfs'])

    expect(algoIds).toContain('algo-bfs')
    const bfs = migrationResult.state.data.algorithms.find(al => al.id === 'algo-bfs')
    expect(bfs?.status).toBe('TESTED')

    // User collections preserved
    expect(migrationResult.state.data.tasks).toHaveLength(1)
    expect(migrationResult.state.data.cpProblems).toHaveLength(1)
    expect(migrationResult.state.data.brainDumpNotes).toHaveLength(1)
  })

  it('8. ensures importing an older backup does not silently reintroduce removed records', () => {
    const currentPayload: ApplicationDataPayload = {
      topics: [...SEED_TOPICS],
      adts: [...SEED_ADTS],
      algorithms: [...SEED_ALGORITHMS],
      cpProblems: [],
      tasks: [],
      brainDumpNotes: [],
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
    }

    const olderBackupPayload: ApplicationDataPayload = {
      topics: [
        {
          id: 'topic-skip-list-struct',
          unit: 'UNIT_II',
          chapter: 'Skip Lists',
          title: 'Skip List Structure',
          description: '',
          classification: 'REQUIRED',
          priority: 'HIGH',
          studyStatus: 'COMPLETED',
          confidence: 5,
          implementationStatus: 'NOT_APPLICABLE',
          revisionStatus: 'NOT_DUE',
          completionRequirements: { manualConfirmationRequired: true },
          linkedTaskIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          notes: 'Old backup note',
          createdAt: '2026-10-15T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        },
      ],
      adts: [
        {
          id: 'adt-skip-list',
          name: 'Skip List',
          category: 'MAPS_AND_DICTIONARIES',
          relatedSyllabusTopicIds: [],
          status: 'IMPLEMENTED',
          essentialOperations: [],
          edgeCasesVerified: [],
          complexityNotes: '',
          linkedTaskIds: [],
          linkedAlgorithmIds: [],
          createdAt: '2026-10-15T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        },
      ],
      algorithms: [
        {
          id: 'algo-warshall',
          name: "Warshall's Transitive Closure",
          category: 'GRAPH_ALGORITHMS',
          classification: 'REQUIRED',
          relatedSyllabusTopicIds: [],
          relatedAdtIds: [],
          status: 'TESTED',
          isCorrectnessTested: true,
          isSampleTraceCompleted: true,
          timeComplexity: 'O(V^3)',
          auxiliarySpaceComplexity: '',
          preconditions: '',
          commonMistakesAndNotes: '',
          linkedCpProblemIds: [],
          linkedTaskIds: [],
          createdAt: '2026-10-15T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        },
      ],
      cpProblems: [],
      tasks: [
        {
          id: 'task-survivor',
          title: 'Task from backup',
          category: 'LEARN',
          status: 'TO_DO',
          priority: 'HIGH',
          subtasks: [],
          linkedSyllabusTopicIds: [],
          linkedAdtIds: [],
          linkedAlgorithmIds: [],
          linkedCpProblemIds: [],
          createdAt: '2026-10-15T00:00:00.000Z',
          updatedAt: '2026-10-28T00:00:00.000Z',
        } as Task,
      ],
      brainDumpNotes: [],
      studySessions: [],
      revisions: [],
      settings: currentPayload.settings,
    }

    const { mergedData, report } = mergeBackupData(currentPayload, olderBackupPayload)

    // The removed items must NOT have been added
    expect(mergedData.topics.some(t => REMOVED_SYLLABUS_SET.has(t.id))).toBe(false)
    expect(mergedData.adts.some(a => REMOVED_ADT_SET.has(a.id))).toBe(false)
    expect(mergedData.algorithms.some(al => REMOVED_ALGORITHM_SET.has(al.id))).toBe(false)

    // User task from backup is preserved
    expect(mergedData.tasks.some(t => t.id === 'task-survivor')).toBe(true)
    expect(report.tasksAdded).toBe(1)
  })
})

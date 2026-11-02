/**
 * Academic Dataset Verification & Manifest Integrity Tests
 * 
 * Verifies:
 * 1. Exact record counts for Syllabus (63), ADTs (29), Algorithms (27).
 * 2. Uniqueness and stability of all IDs.
 * 3. Explicit Required / Optional classification.
 * 4. Dijkstra non-negative edge weight precondition.
 * 5. Structural completeness of essential operation checklists.
 * 6. Cross-reference relationship integrity across all entities.
 */

import { describe, it, expect } from 'vitest'
import { SEED_TOPICS } from '../data/seed/syllabusSeed'
import { SEED_ADTS } from '../data/seed/adtSeed'
import { SEED_ALGORITHMS } from '../data/seed/algorithmSeed'
import { validateTopic, validateADT, validateAlgorithm } from '../lib/validation/validators'

describe('Academic Dataset Completeness & Manifest Tests', () => {
  // ==========================================================================
  // Syllabus Dataset (BUILDSPEC Section 5)
  // ==========================================================================
  describe('Syllabus Seed Dataset', () => {
    it('contains exactly 63 total syllabus topics (62 required + 1 optional extension)', () => {
      expect(SEED_TOPICS.length).toBe(63)

      const requiredTopics = SEED_TOPICS.filter(t => t.classification === 'REQUIRED')
      const optionalTopics = SEED_TOPICS.filter(t => t.classification === 'OPTIONAL')

      expect(requiredTopics.length).toBe(62)
      expect(optionalTopics.length).toBe(1)
    })

    it('covers all three units with exact required topic distributions', () => {
      const unit1 = SEED_TOPICS.filter(t => t.unit === 'UNIT_I' && t.classification === 'REQUIRED')
      const unit2 = SEED_TOPICS.filter(t => t.unit === 'UNIT_II' && t.classification === 'REQUIRED')
      const unit3 = SEED_TOPICS.filter(t => t.unit === 'UNIT_III' && t.classification === 'REQUIRED')

      // Unit 1: Foundations (13) + Arrays, Linked Lists (8) + Stacks & Queues (11) = 32
      expect(unit1.length).toBe(32)

      // Unit 2: Trees (7) + Priority Queues (4) + Maps & Dictionaries (5) = 16
      expect(unit2.length).toBe(16)

      // Unit 3: Search Trees (4) + External Memory (2) + Graphs (8) = 14
      expect(unit3.length).toBe(14)
    })

    it('has deterministic, unique topic IDs and valid schema structure for every topic', () => {
      const ids = new Set<string>()
      for (const topic of SEED_TOPICS) {
        expect(topic.id).toBeDefined()
        expect(topic.id.startsWith('topic-')).toBe(true)
        expect(ids.has(topic.id)).toBe(false)
        ids.add(topic.id)

        const validation = validateTopic(topic)
        expect(validation.isValid).toBe(true)
        expect(validation.errors).toHaveLength(0)

        // Seed integrity: Default study status must be NOT_STARTED and confidence 1
        expect(topic.studyStatus).toBe('NOT_STARTED')
        expect(topic.confidence).toBe(1)
      }
    })

    it('explicitly classifies the extension topic as OPTIONAL', () => {
      const unionFind = SEED_TOPICS.find(t => t.id === 'topic-disjoint-set-adt')
      expect(unionFind).toBeDefined()
      expect(unionFind?.classification).toBe('OPTIONAL')
    })
  })

  // ==========================================================================
  // ADT Implementation Inventory (BUILDSPEC Section 6)
  // ==========================================================================
  describe('ADT Inventory Dataset', () => {
    it('contains all 29 specified ADT and representation records', () => {
      expect(SEED_ADTS.length).toBe(29)
    })

    it('distributes ADTs across all specified categories', () => {
      const linear = SEED_ADTS.filter(a => a.category === 'LINEAR')
      const treesAndPriority = SEED_ADTS.filter(a => a.category === 'TREES_AND_PRIORITY')
      const mapsAndDicts = SEED_ADTS.filter(a => a.category === 'MAPS_AND_DICTIONARIES')
      const advanced = SEED_ADTS.filter(a => a.category === 'ADVANCED')
      const graphs = SEED_ADTS.filter(a => a.category === 'GRAPH_REPRESENTATIONS')

      // Linear: 10
      expect(linear.length).toBe(10)
      // Trees & Priority: General Tree, Binary Tree, Traversals, Linked Binary Tree, Array Binary Tree, List PQ, Heap PQ, Min-Heap, Max-Heap, BST, AVL = 11
      expect(treesAndPriority.length).toBe(11)
      // Maps & Dicts: List-Based Map, Hash Table, Dictionary ADT = 3
      expect(mapsAndDicts.length).toBe(3)
      // Advanced: 0
      expect(advanced.length).toBe(0)
      // Graphs: Adjacency List, Adjacency Matrix, Edge List, Weighted Graph, Disjoint Set (DSU) = 5
      expect(graphs.length).toBe(5)

      expect(linear.length + treesAndPriority.length + mapsAndDicts.length + advanced.length + graphs.length).toBe(29)
    })

    it('has deterministic, unique ADT IDs and valid schema structure for every ADT', () => {
      const ids = new Set<string>()
      for (const adt of SEED_ADTS) {
        expect(adt.id).toBeDefined()
        expect(adt.id.startsWith('adt-')).toBe(true)
        expect(ids.has(adt.id)).toBe(false)
        ids.add(adt.id)

        const validation = validateADT(adt)
        expect(validation.isValid).toBe(true)

        // Integrity: Default status must be NOT_STARTED, not fabricated
        expect(adt.status).toBe('NOT_STARTED')
        expect(adt.lastTestedAt).toBeUndefined()
        expect(adt.masteredAt).toBeUndefined()
      }
    })

    it('provides meaningful essential operation checklists with time and space complexity notes', () => {
      for (const adt of SEED_ADTS) {
        expect(adt.essentialOperations.length).toBeGreaterThanOrEqual(2)
        expect(adt.complexityNotes.length).toBeGreaterThan(10)

        for (const op of adt.essentialOperations) {
          expect(op.id).toBeDefined()
          expect(op.name).toBeDefined()
          expect(op.isCompleted).toBe(false) // Never checked by default!
          expect(op.timeComplexity).toBeDefined()
        }
      }
    })

    it('includes specific critical ADTs: Singly Linked List, BST, AVL, Disjoint Set', () => {
      const sll = SEED_ADTS.find(a => a.id === 'adt-singly-linked-list')
      expect(sll).toBeDefined()
      expect(sll?.essentialOperations.some(op => op.name.includes('reverse'))).toBe(true)

      const bst = SEED_ADTS.find(a => a.id === 'adt-bst')
      expect(bst).toBeDefined()
      expect(bst?.essentialOperations.some(op => op.name.includes('delete'))).toBe(true)

      const avl = SEED_ADTS.find(a => a.id === 'adt-avl-tree')
      expect(avl).toBeDefined()
      expect(avl?.essentialOperations.some(op => op.name.includes('Rotation'))).toBe(true)

      const dsu = SEED_ADTS.find(a => a.id === 'adt-disjoint-set')
      expect(dsu).toBeDefined()
      expect(dsu?.essentialOperations.some(op => op.name.includes('find'))).toBe(true)
      expect(dsu?.essentialOperations.some(op => op.name.includes('union'))).toBe(true)
    })
  })

  // ==========================================================================
  // Algorithm Inventory (BUILDSPEC Section 7)
  // ==========================================================================
  describe('Algorithm Inventory Dataset', () => {
    it('contains all 27 specified classic algorithm records', () => {
      expect(SEED_ALGORITHMS.length).toBe(27)
    })

    it('distributes algorithms across all five categories', () => {
      const recursion = SEED_ALGORITHMS.filter(a => a.category === 'COMPLEXITY_AND_RECURSION')
      const searching = SEED_ALGORITHMS.filter(a => a.category === 'SEARCHING')
      const sorting = SEED_ALGORITHMS.filter(a => a.category === 'SORTING')
      const treeAlgos = SEED_ALGORITHMS.filter(a => a.category === 'TREE_ALGORITHMS')
      const graphAlgos = SEED_ALGORITHMS.filter(a => a.category === 'GRAPH_ALGORITHMS')

      expect(recursion.length).toBe(4)
      expect(searching.length).toBe(2)
      expect(sorting.length).toBe(7)
      expect(treeAlgos.length).toBe(9)
      expect(graphAlgos.length).toBe(5)

      expect(recursion.length + searching.length + sorting.length + treeAlgos.length + graphAlgos.length).toBe(27)
    })

    it('has deterministic, unique algorithm IDs and valid schema structure for every algorithm', () => {
      const ids = new Set<string>()
      for (const algo of SEED_ALGORITHMS) {
        expect(algo.id).toBeDefined()
        expect(algo.id.startsWith('algo-')).toBe(true)
        expect(ids.has(algo.id)).toBe(false)
        ids.add(algo.id)

        const validation = validateAlgorithm(algo)
        expect(validation.isValid).toBe(true)

        // Integrity: Default status must be NOT_STARTED and untested
        expect(algo.status).toBe('NOT_STARTED')
        expect(algo.isCorrectnessTested).toBe(false)
        expect(algo.isSampleTraceCompleted).toBe(false)
      }
    })

    it("explicitly confirms that Dijkstra's algorithm documents its non-negative edge-weight precondition", () => {
      const dijkstra = SEED_ALGORITHMS.find(a => a.id === 'algo-dijkstra')
      expect(dijkstra).toBeDefined()
      expect(dijkstra?.preconditions).toMatch(/non-negative/i)
      expect(dijkstra?.preconditions).toMatch(/w\(u, v\) >= 0|>= 0/i)
      expect(dijkstra?.commonMistakesAndNotes).toMatch(/negative edge/i)
    })
  })

  // ==========================================================================
  // Cross-Entity Relationship Integrity
  // ==========================================================================
  describe('Cross-Reference Relationship Integrity', () => {
    it('ensures all linkedAdtIds in syllabus topics exist in ADT seed inventory', () => {
      const adtIdSet = new Set(SEED_ADTS.map(a => a.id))
      for (const topic of SEED_TOPICS) {
        for (const adtId of topic.linkedAdtIds) {
          expect(adtIdSet.has(adtId), `Topic ${topic.id} references non-existent ADT ${adtId}`).toBe(true)
        }
        if (topic.completionRequirements.requiredAdtIds) {
          for (const adtId of topic.completionRequirements.requiredAdtIds) {
            expect(adtIdSet.has(adtId), `Topic ${topic.id} requires non-existent ADT ${adtId}`).toBe(true)
          }
        }
      }
    })

    it('ensures all linkedAlgorithmIds in syllabus topics exist in Algorithm seed inventory', () => {
      const algoIdSet = new Set(SEED_ALGORITHMS.map(a => a.id))
      for (const topic of SEED_TOPICS) {
        for (const algoId of topic.linkedAlgorithmIds) {
          expect(algoIdSet.has(algoId), `Topic ${topic.id} references non-existent Algorithm ${algoId}`).toBe(true)
        }
        if (topic.completionRequirements.requiredAlgorithmIds) {
          for (const algoId of topic.completionRequirements.requiredAlgorithmIds) {
            expect(algoIdSet.has(algoId), `Topic ${topic.id} requires non-existent Algorithm ${algoId}`).toBe(true)
          }
        }
      }
    })

    it('ensures all relatedSyllabusTopicIds in ADTs exist in Syllabus seed inventory', () => {
      const topicIdSet = new Set(SEED_TOPICS.map(t => t.id))
      for (const adt of SEED_ADTS) {
        for (const topicId of adt.relatedSyllabusTopicIds) {
          expect(topicIdSet.has(topicId), `ADT ${adt.id} references non-existent Topic ${topicId}`).toBe(true)
        }
      }
    })

    it('ensures all relatedSyllabusTopicIds and relatedAdtIds in Algorithms exist in their datasets', () => {
      const topicIdSet = new Set(SEED_TOPICS.map(t => t.id))
      const adtIdSet = new Set(SEED_ADTS.map(a => a.id))

      for (const algo of SEED_ALGORITHMS) {
        for (const topicId of algo.relatedSyllabusTopicIds) {
          expect(topicIdSet.has(topicId), `Algorithm ${algo.id} references non-existent Topic ${topicId}`).toBe(true)
        }
        for (const adtId of algo.relatedAdtIds) {
          expect(adtIdSet.has(adtId), `Algorithm ${algo.id} references non-existent ADT ${adtId}`).toBe(true)
        }
      }
    })
  })
})

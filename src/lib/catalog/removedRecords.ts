/**
 * Permanently Removed Curriculum Records
 * 
 * Central registry of records fully removed from the active DSACC catalogs:
 * - 9 Syllabus Topics (Skip Lists, Segment Trees, B-Trees, Red-Black Trees, Transitive Closure)
 * - 3 ADTs (Skip List, Segment Tree, B-Tree)
 * - 2 Algorithms (Warshall's Transitive Closure, Topological Sorting)
 * 
 * Used across migrations and backup import sanitation to ensure removed records
 * can never be reintroduced into active catalogs.
 */

export const REMOVED_SYLLABUS_TOPIC_IDS: readonly string[] = [
  'topic-skip-list-struct',
  'topic-skip-list-impl',
  'topic-skip-list-complexity',
  'topic-segment-trees',
  'topic-segment-tree-impl',
  'topic-b-trees',
  'topic-b-tree-impl',
  'topic-red-black-tree',
  'topic-transitive-closure',
]

export const REMOVED_ADT_IDS: readonly string[] = [
  'adt-skip-list',
  'adt-segment-tree',
  'adt-b-tree',
]

export const REMOVED_ALGORITHM_IDS: readonly string[] = [
  'algo-warshall',
  'algo-topological-sort',
]

export const REMOVED_SYLLABUS_SET = new Set<string>(REMOVED_SYLLABUS_TOPIC_IDS)
export const REMOVED_ADT_SET = new Set<string>(REMOVED_ADT_IDS)
export const REMOVED_ALGORITHM_SET = new Set<string>(REMOVED_ALGORITHM_IDS)

export function isRemovedCurriculumRecord(id: string): boolean {
  return REMOVED_SYLLABUS_SET.has(id) || REMOVED_ADT_SET.has(id) || REMOVED_ALGORITHM_SET.has(id)
}

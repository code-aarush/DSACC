/**
 * Selective Syllabus Archiving Constants and Helpers
 * 
 * Excludes only the specified syllabus topics from the active Syllabus Tracker
 * and required progress calculations, preserving all surrounding topics (DAGs,
 * BFS, DFS, Dijkstra, Prim, Kruskal) and without modifying ADTs or Algorithms.
 */

export const EXCLUDED_SYLLABUS_TOPIC_IDS: readonly string[] = [
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

export const EXCLUDED_SYLLABUS_SET = new Set<string>(EXCLUDED_SYLLABUS_TOPIC_IDS)

/**
 * Checks whether a syllabus topic is in the excluded/archived set.
 * Explicitly protects 'topic-dag' (Directed Acyclic Graphs) and other standard curriculum.
 */
export function isSyllabusTopicExcluded(topic: { id: string; title?: string }): boolean {
  // Explicitly preserve DAGs and other preserved graph topics
  if (topic.id === 'topic-dag' || (topic.title && topic.title.toLowerCase().includes('directed acyclic graph'))) {
    return false
  }
  if (EXCLUDED_SYLLABUS_SET.has(topic.id)) {
    return true
  }
  // Check for exact custom topic titles if user added them separately
  if (topic.title) {
    const lower = topic.title.toLowerCase().trim()
    if (
      lower === 'topological sorting' ||
      lower === "warshall's transitive closure" ||
      lower === 'warshalls transitive closure' ||
      lower === 'transitive closure'
    ) {
      return true
    }
  }
  return false
}

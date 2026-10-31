export type NavSectionId =
  | 'overview'
  | 'syllabus'
  | 'adt-library'
  | 'algorithm-library'
  | 'cp-practice'
  | 'tasks'
  | 'brain-dump'
  | 'analytics'

export interface NavSectionMeta {
  id: NavSectionId
  title: string
  shortTitle: string
  badge?: string
  milestoneTarget: string
}

export const SECTIONS: NavSectionMeta[] = [
  { id: 'overview', title: 'Preparation Overview', shortTitle: 'Overview', milestoneTarget: 'M1 & M3' },
  { id: 'syllabus', title: 'Syllabus Master Tracker', shortTitle: 'Syllabus', badge: 'Units 1-3', milestoneTarget: 'M2' },
  { id: 'adt-library', title: 'ADT Implementation Library', shortTitle: 'ADT Library', badge: '24 ADTs', milestoneTarget: 'M2' },
  { id: 'algorithm-library', title: 'Algorithm Inventory', shortTitle: 'Algorithms', badge: '25+ Algos', milestoneTarget: 'M2' },
  { id: 'cp-practice', title: 'Competitive Programming Practice', shortTitle: 'CP Practice', milestoneTarget: 'M3' },
  { id: 'tasks', title: 'Tasks and Study Plan', shortTitle: 'Tasks & Plan', milestoneTarget: 'M3' },
  { id: 'brain-dump', title: 'Brain Dump & Doubt Workspace', shortTitle: 'Brain Dump', milestoneTarget: 'M3' },
  { id: 'analytics', title: 'Revision and Analytics', shortTitle: 'Analytics', milestoneTarget: 'M4' },
]

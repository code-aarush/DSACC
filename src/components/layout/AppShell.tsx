import React from 'react'
import { useApp } from '../../context/useApp'
import { SECTIONS } from '../../context/navigationSections'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { MobileNav } from './MobileNav'
import { OverviewSection } from '../../features/overview/OverviewSection'
import { SyllabusSection } from '../../features/syllabus/SyllabusSection'
import { ADTSection } from '../../features/adt-library/ADTSection'
import { AlgorithmSection } from '../../features/algorithm-library/AlgorithmSection'
import { PlaceholderSection } from '../common/PlaceholderSection'

export const AppShell: React.FC = () => {
  const { activeSection, storageError, isInitialized } = useApp()

  const currentSectionMeta = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0]

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />

      case 'syllabus':
        return <SyllabusSection />

      case 'adt-library':
        return <ADTSection />

      case 'algorithm-library':
        return <AlgorithmSection />

      case 'cp-practice':
        return (
          <PlaceholderSection
            section={currentSectionMeta}
            description="Competitive programming problem log tracking independent vs assisted solves, difficulty, platform URLs, and mistakes."
            deliverables={[
              'Problem log supporting LeetCode, HackerRank, CodeChef, and Codeforces',
              'Strict separation of independent solves vs hint/editorial assisted solves',
              'Mistakes and key insight note capture',
              'Revisit date tracking for spaced practice',
            ]}
          />
        )

      case 'tasks':
        return (
          <PlaceholderSection
            section={currentSectionMeta}
            description="Daily study planning and prioritized task management with estimate vs actual time tracking and subtasks."
            deliverables={[
              'Today, upcoming, and overdue task calculations without broken boundaries',
              'Task categories: Learn, Implement, Test, Revise, CP Practice, Mock Exam, Admin',
              'Subtasks and study duration tracking',
              'Guarantee: Task completion does NOT automatically mark topics complete',
            ]}
          />
        )

      case 'brain-dump':
        return (
          <PlaceholderSection
            section={currentSectionMeta}
            description="Quick-capture mental workspace for ideas, unresolved doubts, mistakes, concept explanations, and exam tips."
            deliverables={[
              'Instant capture with autosave and clear status feedback',
              'Doubt resolution workflow preserving resolution history',
              'Convert doubts into revision tasks without losing original note',
              'Tagging and pinning support',
            ]}
          />
        )

      case 'analytics':
        return (
          <PlaceholderSection
            section={currentSectionMeta}
            description="Actionable revision intelligence, weak-topic identification based on confidence ratings, and data recovery."
            deliverables={[
              'Required syllabus coverage by unit excluding optional topics',
              'Low-confidence weak topic identification (1-5 scale)',
              'JSON export and validated restore workflows',
              'Merge and replace recovery modes with pre-restore safety backups',
            ]}
          />
        )

      default:
        return <OverviewSection />
    }
  }

  return (
    <div className="app-container">
      <AppHeader />
      
      {storageError && (
        <div className="alert-banner error" role="alert" style={{ margin: 'var(--space-2) var(--space-4) 0' }}>
          <strong>Storage Notice:</strong> {storageError.message}
          <span> (Edits are preserved in memory to prevent data loss).</span>
        </div>
      )}

      <div className="app-body">
        <AppSidebar />
        <main className="app-content" id="main-content" tabIndex={-1}>
          {!isInitialized ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p className="card-description">Initializing workspace persistence boundary...</p>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

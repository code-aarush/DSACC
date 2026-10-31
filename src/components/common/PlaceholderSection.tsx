import React from 'react'
import { NavSectionMeta } from '../../context/navigationSections'

interface PlaceholderSectionProps {
  section: NavSectionMeta
  description: string
  deliverables: string[]
}

export const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({
  section,
  description,
  deliverables,
}) => {
  return (
    <div className="placeholder-container" role="region" aria-labelledby={`heading-${section.id}`}>
      <div className="section-header">
        <div className="section-header-top">
          <div>
            <h2 id={`heading-${section.id}`} className="section-title">{section.title}</h2>
            <p className="section-subtitle">Scope: {section.milestoneTarget}</p>
          </div>
          <span className="badge badge-warning">Scheduled for {section.milestoneTarget}</span>
        </div>
      </div>

      <div className="placeholder-banner">
        <div className="placeholder-icon" aria-hidden="true">&#9881;</div>
        <h3 className="placeholder-heading">Module Under Staged Construction</h3>
        <p className="placeholder-text">{description}</p>
        
        <div className="placeholder-scope-box">
          <span>Target Delivery: <strong>{section.milestoneTarget}</strong></span>
          <span>&bull;</span>
          <span>Schema Contracts: <strong>Established</strong></span>
        </div>

        <ul className="placeholder-deliverables-list">
          {deliverables.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h4 className="card-title">Contract &amp; Data Integrity Guarantees</h4>
        <p className="card-description">
          The TypeScript interfaces, schema migration pipelines, and validation rules for this module
          have been established and tested in Milestone 1. Production seeding and interactive tracking
          will unlock in accordance with the 5-milestone approved execution plan.
        </p>
      </div>
    </div>
  )
}

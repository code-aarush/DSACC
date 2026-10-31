# MASTER ENGINEERING INSTRUCTIONS
## Persistent Instructions for Antigravity

### 1. Role

Act as the senior full-stack engineer, software architect, UI/UX designer, QA engineer and technical project lead for the DSA End-Sem Command Centre.

Your objective is to deliver a complete, reliable application, not merely generate source files or a visually convincing dashboard.

### 2. Source of truth

Use the supplied DSA End-Sem Command Centre Build Specification as the authoritative product contract.

The approved decisions are:

- React + TypeScript + Vite.
- Plain CSS and centralised design tokens.
- Versioned localStorage.
- Unit tests first, with broader testing as the application grows.
- Single user and local-first operation.
- No cloud backend.
- No filesystem integration.
- Five milestone gates.
- Explicit user approval before advancing.

If a requirement is ambiguous, make the safest reasonable choice, document it and ask only when the decision materially affects functionality or data safety.

Do not silently omit specified syllabus topics or implementation records.

### 3. Mandatory execution order

Execute exactly these five milestones:

1. Foundation and Architecture.
2. Academic Data and Libraries.
3. Daily Study Workflows.
4. Revision Intelligence and Recovery.
5. QA, Hardening and Release.

Only work on the currently authorised milestone.

At the end of a milestone:

1. Stop implementation.
2. Run applicable checks.
3. Report actual outcomes.
4. List files created or changed.
5. Document deviations and known issues.
6. Compare results against the acceptance criteria.
7. Request explicit approval to proceed.

Do not begin the next milestone without approval.

### 4. Engineering standards

- Use strict TypeScript.
- Prefer simple, maintainable code.
- Keep dependencies minimal.
- Use stable IDs, never array positions, as record identities.
- Separate UI, domain logic, storage, validation and seed data.
- Centralise status enums and schema versions.
- Centralise date handling and progress calculations.
- Use semantic HTML and accessible controls.
- Keep UI state and persisted state consistent.
- Avoid duplicated sources of truth.
- Keep code and module boundaries proportional to a single-user application.

Do not overengineer the application into a SaaS platform.

### 5. Data integrity rules

Never:

- Overwrite valid user data during initialisation.
- Seed duplicate records during repeated initialisation.
- Delete data without explicit user confirmation.
- Commit invalid imported data.
- Claim autosave works without testing persistence.
- Silently discard edits after storage errors.
- Invent study activity or progress.
- Mark an implementation tested because checkboxes are complete.
- Count an assisted CP solution as an independent solve.
- Count optional topics toward required-syllabus completion.
- Treat task completion as topic completion.
- Infer mastery solely from time spent or checklist completion.
- Claim a test passed without executing it.

Always preserve recoverable data when handling migrations, imports and destructive actions.

### 6. Persistence contract

Use versioned localStorage behind a typed storage adapter.

Implement:

- Runtime validation.
- Safe initialisation.
- Idempotent seed loading.
- Schema migrations.
- Serialised writes.
- Storage error handling.
- Honest Saving, Saved and Save Error states.
- Validated JSON export and import.
- Replace and merge recovery modes.
- A safety backup before destructive restoration.

If a write fails, retain the user's edit in the application state and communicate the failure. Do not falsely display Saved.

Do not assume localStorage is permanent or unlimited.

### 7. Academic semantics

Keep the following states distinct:

- Study status.
- Implementation status.
- Correctness-tested state.
- Mastery.
- Revision state.

Topic completion must follow configured evidence requirements or explicit manual confirmation.

Topics with no requirements must not become complete automatically.

ADT mastery can be suggested from evidence but requires explicit user confirmation.

Independent CP solving must be explicitly recorded by the user.

Required-syllabus progress excludes optional topics.

### 8. Interface contract

The app has eight in-app sections:

- Overview.
- Syllabus.
- ADT Library.
- Algorithm Library.
- CP Practice.
- Tasks and Study Plan.
- Brain Dump.
- Review and Analytics.

Build a compact, responsive developer workspace.

Use a desktop sidebar and compact mobile navigation, light mode by default, a reliable dark-mode toggle, readable dense tables, visible focus states and useful empty/error states.

Every visible control must work or be explicitly presented as unavailable or not yet implemented.

Never use fake charts or fabricated metrics to fill empty space.

### 9. Testing contract

Run the available checks at each milestone.

Report:

- Exact command or check.
- Whether it executed.
- Pass or fail.
- Relevant failure details.
- Whether a fix was applied and retested.

Distinguish tests that passed from checks that were not available or not executed.

Fix implementation-caused failures before closing a milestone.

### 10. Change management

Before adding dependencies, changing storage architecture, changing the product scope or introducing a new service, justify the change.

Prefer the smallest reliable solution.

Preserve existing working code and user data during refactoring.

Do not rewrite unrelated modules merely to enforce personal stylistic preferences.

Document material deviations from the approved specification.

### 11. Completion report format

At the end of each milestone, produce:

1. Summary.
2. Deliverables completed.
3. Files created or modified.
4. Architecture decisions.
5. Commands and tests executed.
6. Actual test results.
7. Acceptance criteria checklist.
8. Known issues and limitations.
9. Data-integrity risks, if any.
10. Next milestone prerequisites.
11. Request for explicit approval.

A milestone is not complete merely because implementation code exists.

### 12. Current authorisation

**Only Milestone 1 is authorised.**

Do not implement the complete syllabus, inventories, task manager, CP tracker, brain dump, analytics or backup interface during Milestone 1.

Complete the foundation, verify it and stop.

Wait for the user's approval before beginning Milestone 2.
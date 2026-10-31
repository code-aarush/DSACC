# DSA End-Sem Command Centre

Local-first, single-user academic preparation and productivity workspace for Data Structures and Algorithms end-semester examination revision.

Target Exam: **3 November 2026** (Configurable in application settings)

---

## Architecture Overview

The DSA End-Sem Command Centre is designed with a strict separation of concerns, high-density developer ergonomics, and rock-solid data integrity guarantees.

- **Frontend Core:** React 19 + TypeScript (Strict Mode) + Vite
- **Styling Architecture:** Plain Vanilla CSS with centralized design tokens (`src/styles/tokens.css`, `theme.css`, `global.css`, `layout.css`, `components.css`)
- **Themes:** Light mode by default with reliable dark mode toggle persisted to storage
- **Persistence Boundary:** LocalStorage behind a typed `StorageAdapter` interface with:
  - Versioned envelope (`VersionedApplicationState` with `CURRENT_SCHEMA_VERSION = 1`)
  - Serialized asynchronous writes via `WriteQueue` to eliminate race conditions
  - Runtime validation schemas for all domain entities
  - Corrupted/malformed data quarantine (preventing silent overwrites of user data)
  - Explicit schema migration pipeline preserving valid user records
  - Transparent save statuses: `IDLE`, `SAVING`, `SAVED`, and `ERROR`
- **Testing Suite:** Vitest with jsdom and `@testing-library/react`

---

## Directory Structure

```
src/
├── types/                     # Domain models, schema envelopes, and storage contracts
│   ├── domain.ts              # SyllabusTopic, ADT, Algorithm, CPProblem, Task, Note, Settings
│   ├── storage.ts             # StorageAdapter, StorageResult, StorageError, SaveStatus
│   └── index.ts               # Barrel exports
├── lib/
│   ├── ids/                   # Stable cryptographic and prefixed ID generators
│   ├── date/                  # Exam countdown, timezone-safe calculations, overdue checks
│   ├── validation/            # Pre-commit runtime validators for envelopes and entities
│   └── storage/               # LocalStorageAdapter, WriteQueue, Migrations, StorageService
├── context/                   # State providers, ThemeContext, AppContext, navigation tokens
├── styles/                    # Centralized design tokens, light/dark themes, components
├── components/
│   ├── common/                # Badges, StatusBadge, CountdownBadge, ThemeToggle, Placeholders
│   └── layout/                # AppShell, AppHeader, AppSidebar, MobileNav
├── features/
│   └── overview/              # Introductory overview workspace and system status
└── test/                      # Vitest suites (smoke, storage, validation, date, navigation)
```

---

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launch local Vite development server with HMR |
| `npm run build` | Compile TypeScript and produce production bundle in `dist/` |
| `npm test` | Run all 35 foundation test suites with Vitest |
| `npm run test:watch` | Run test runner in interactive watch mode |
| `npm run lint` | Run ESLint across TypeScript and React modules |
| `npm run typecheck` | Run TypeScript compiler type checking (`tsc -b`) |

---

## Milestone Execution Roadmap

| Milestone | Status | Deliverables |
| :--- | :--- | :--- |
| **Milestone 1: Foundation and Architecture** | **Complete** | Tooling, strict TypeScript, design tokens, storage adapter, validation, test suites, responsive shell |
| **Milestone 2: Academic Data and Libraries** | *Awaiting Approval* | Seed full syllabus (Units 1–3), 24 ADT records, 25+ algorithms, completion semantics |
| **Milestone 3: Daily Study Workflows** | *Planned* | Task manager, daily planner, CP tracker, instant brain dump & doubts |
| **Milestone 4: Revision Intelligence & Recovery** | *Planned* | Weak-topic discovery, revision scheduler, JSON backup export/import, merge/replace recovery |
| **Milestone 5: QA, Hardening and Release** | *Planned* | End-to-end audit, cross-browser verification, release bundle |

---

## Persistence Guarantees & Known Limitations

1. **No Silent Overwrite:** Initialisation will never overwrite existing valid user data. If localStorage contains corrupted data, it is quarantined to `dsacc_quarantine_corrupted_*` and reported via the UI rather than silently erased.
2. **Browser LocalStorage Quota:** LocalStorage is limited to ~5–10MB depending on the browser. JSON backup exports will be available in Milestone 4 to export snapshots.
3. **Single Device:** Storage is bound to the local browser profile. No cloud accounts or tracking are used.

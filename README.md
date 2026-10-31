# DSA End-Sem Command Centre (DSACC)

**DSACC** is a local-first, single-user academic preparation and productivity command centre designed for Data Structures and Algorithms end-semester examination revision.

Target Exam: **3 November 2026** (Configurable in application settings).

---

## 1. Feature Architecture & Command Modules

The application is organized into 8 synchronized modules accessible via the navigation sidebar and mobile drawer:

1. **Preparation Overview (`overview`):**
   - Real-time exam countdown timer with configurable date and title.
   - 4-card key indicators row: Task completion, Syllabus coverage, Spaced Repetition status, and CP metrics.
   - Next Actionable Study Task hero card with 1-click completion.
   - Next Prioritized Spaced Revision hero card with direct jump link.
   - Weak Topics and Unresolved Doubts summary widgets.
   - Execution Roadmap and Milestone status tracking.

2. **Syllabus Master Tracker (`syllabus`):**
   - Complete 72-topic curriculum spanning Unit I (Foundations & Linear Structures), Unit II (Trees & Priority Queues), and Unit III (Search Trees, Maps & Graphs).
   - Strict `REQUIRED` vs `OPTIONAL` classification.
   - Explicit completion requirement contracts: theoretical manual confirmation, leaf task prerequisites, or ADT/algorithm testing.
   - Self-reported confidence ratings (1 to 5) with active filtering and search.
   - Custom user topic creation with safe deletion.

3. **ADT Implementation Library (`adt-library`):**
   - 32 Abstract Data Type specifications across Linear, Trees & Priority, Maps & Dictionaries, and Graph Representations.
   - Bidirectional lifecycle progression: `NOT_STARTED` $\to$ `IN_PROGRESS` $\to$ `IMPLEMENTED` $\to$ `TESTED` $\to$ `MASTERED`.
   - Essential and custom operation checklists with time/space complexity notes.
   - Edge case verification checklists and known issue documentation.

4. **Algorithm Inventory (`algorithm-library`):**
   - 29 standard and advanced algorithms across Sorting, Searching, Tree Algorithms, and Graph Algorithms.
   - Precondition documentation, invariant notes, common traps, and time/space complexity specifications.
   - Correctness testing checklists and manual paper trace verification.

5. **Competitive Programming Practice (`cp-practice`):**
   - Multi-platform tracker supporting LeetCode, HackerRank, CodeChef, Codeforces, GeeksforGeeks, and Other.
   - Independent vs. assisted solve semantics (independent solves require explicit user confirmation without hints or solutions viewed).
   - Trap notes, key insights, mistake documentation, and revisit date scheduling.

6. **Tasks and Daily Study Plan (`tasks`):**
   - High-density task manager with category classification (`LEARN`, `IMPLEMENT`, `TEST`, `REVISE`, `CP_PRACTICE`, `MOCK_EXAM`, `ADMIN`).
   - Priority tagging (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), subtasks, estimated and actual durations.
   - Daily Focus queue, Today view, Upcoming, and Overdue filtering.
   - Calendar-safe date handling without UTC day shifts.

7. **Brain Dump & Doubt Workspace (`brain-dump`):**
   - Frictionless quick-capture box allowing rapid note creation without mandatory titles or tags.
   - 7 note categories: Idea, Doubt/Question, Mistake, Concept Explanation, Important Insight, Exam Tip, Pending Research.
   - 1-click doubt resolution preserving full original content.
   - Convert note to study task with bidirectional reference linking.

8. **Revision Intelligence & Data Recovery (`analytics`):**
   - **Spaced Revision Scheduler:** Deterministic interval ladder (`[1, 3, 7, 14, 30]` days). Confidence-sensitive progression: `FAILED` resets to 1 day; `WEAK` steps down; `SATISFACTORY` advances 1 step; `STRONG` advances 2 steps.
   - **Explainable Weak-Area Ranking:** Derives severity flags from low confidence (1–2), overdue deadlines, recent failed reviews, unresolved doubts, and CP traps. Unassessed topics are categorized as Insufficient Data.
   - **Offline JSON Backup & Restore:** Complete export/import of all 9 application stores, deterministic timestamp-based merge, pre-restore safety snapshot creation, and disaster rollback.

---

## 2. Technical Stack & Integrity Architecture

- **Frontend Core:** React 19 + TypeScript (Strict Mode) + Vite
- **Styling Architecture:** Plain Vanilla CSS with centralized design tokens (`tokens.css`, `theme.css`, `global.css`, `layout.css`, `components.css`).
- **Typography & Layout:** Responsive fluid layouts tested from 1440px desktop down to 320px mobile with zero unwanted text wrapping on buttons, badges, chips, or table headers.
- **Persistence Boundary:** LocalStorage behind a typed `StorageAdapter` interface:
  - Versioned envelope (`VersionedApplicationState` with `CURRENT_SCHEMA_VERSION = 2`).
  - Serialized asynchronous writes via `WriteQueue` to eliminate race conditions.
  - Pre-commit runtime validation schema rejecting malformed or corrupted objects.
  - Automatic migration pipeline upgrading historical schemas without data loss.
  - Quarantine mechanism preventing corrupted browser state from overwriting user data.
- **Testing Engine:** Vitest + jsdom + `@testing-library/react`.

---

## 3. Data Backup, Merge, and Disaster Recovery Guide

### Exporting a Backup
1. Navigate to **Revision and Analytics** $\to$ **Backup, Export & Restore**.
2. Click **Download Backup File (.json)**.
3. The browser will download a file named `dsacc-backup-YYYY-MM-DD-HHmm.json`.
4. Store this file in an independent folder on your machine (e.g. `Documents/DSACC_Backups`) or your personal cloud storage.

> **Important:** Browser `localStorage` is bound to your browser profile and can be cleared if site data is wiped. Regularly downloading an independent JSON backup guarantees your academic notes and progress are safe.

### Importing & Merging Backups
1. Under **Import, Merge and Disaster Recovery**, select your `dsacc-backup-*.json` file.
2. The validator will inspect the file, verify schema compatibility, and display a count preview of all candidate records alongside any conflicting IDs.
3. Click **Merge with Existing Data (Safe)** to integrate records:
   - Non-conflicting records are added immediately.
   - Conflicting IDs resolve deterministically by keeping the version with the newer `updatedAt` timestamp.
   - Revision histories merge by deduplicating review log entries.

### Full Restore & Disaster Rollback
1. To replace live application state with a backup, select the validated backup file and click **Full Restore & Replace (Destructive)**.
2. Type `"RESTORE"` into the confirmation prompt to confirm.
3. **Safety Guarantee:** Before executing the replacement, DSACC automatically captures an emergency snapshot of your existing state to `dsacc_pre_restore_safety_backup` in `localStorage`.
4. If the replacement succeeds or if you ever need to revert an accidental restore, a **Rollback to Emergency Safety Snapshot** card will be displayed in the Backup tab to restore your prior data.

### Migrating Progress from Localhost to Hosted Vercel App

Because DSACC is a local-first application, browser `localStorage` is origin-isolated. Data entered on `http://localhost:5173` does not automatically transfer to the hosted Vercel deployment (`https://...vercel.app`). To carry your local progress to the hosted environment:

1. **Export from Localhost:**
   - In your local development session (`http://localhost:5173`), navigate to **Revision and Analytics** $\to$ **Backup, Export & Restore**.
   - Click **Download Backup File (.json)**.
   - Save the `dsacc-backup-*.json` file to your computer.
2. **Import to Hosted Vercel App:**
   - Open your hosted Vercel URL in your browser.
   - Navigate to **Revision and Analytics** $\to$ **Backup, Export & Restore**.
   - Under **Import, Merge and Disaster Recovery**, click **Browse...** (or drop) and select your downloaded `dsacc-backup-*.json` file.
   - Review the candidate record counts in the pre-flight summary card.
   - Click **Full Restore & Replace (Destructive)** and type `"RESTORE"` into the confirmation prompt (or choose **Merge with Existing Data (Safe)** if you already added notes on the hosted site).
3. **Verification:**
   - The application instantly reloads and populates all 72 syllabus topics, 32 ADTs, 29 algorithms, study tasks, CP problems, brain dumps, and revision schedules.
   - All completion percentages and progress bars reflect your exact local progress.

---

## 4. Development & Verification Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launch local Vite development server with HMR |
| `npm run build` | Typecheck with `tsc -b` and produce production build in `dist/` |
| `npm test` | Run complete automated test suite across all 21 test files with Vitest |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run lint` | Run ESLint across TypeScript and React source files |
| `npm run typecheck` | Standalone TypeScript typecheck (`tsc -b`) |
| `npx vercel deploy` | Deploy preview build to Vercel |
| `npx vercel --prod` | Deploy production release to Vercel |

---

## 5. Milestone Verification Record

| Milestone | Status | Deliverables |
| :--- | :--- | :--- |
| **Milestone 1: Foundation and Architecture** | **Verified** | Strict TypeScript, design tokens, storage adapter, validation, test suite, responsive shell |
| **Milestone 2: Academic Data and Libraries** | **Verified** | 72 syllabus topics (Units 1–3), 32 ADT implementations, 29 algorithms, completion criteria |
| **Milestone 3: Daily Study Workflows** | **Verified** | Task manager, daily focus queue, CP problem tracker, instant brain dump & doubt capture |
| **Milestone 4: Revision Intelligence & Recovery** | **Verified** | Spaced revision scheduling, weak-area analytics, validated 9-store JSON export/import/merge/restore |
| **Milestone 5: QA, Hardening and Release** | **Verified** | End-to-end regression audit, backup safety verification, responsive hardening, accessibility, and docs |

---

## 6. Runtime Boundaries & Limitations

1. **Local-First & Offline:** DSACC operates completely in the browser without accounts, cloud sync, authentication, or external analytics.
2. **Persistence:** Data is stored in browser `localStorage`. Always export independent JSON backups before clearing browser site data or cookies.
3. **Single Device:** Since no cloud server exists, data does not sync across devices automatically; use the validated JSON Export and Merge workflow to transfer data between machines.

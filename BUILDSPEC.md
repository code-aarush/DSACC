# DSA END-SEM COMMAND CENTRE
## Product Requirements and Build Specification

**Project type:** Local-first, single-user academic productivity application  
**Primary user:** Computer Science Engineering student preparing for a DSA end-semester examination  
**Initial exam date:** 3 November 2026  
**Initial planning reference:** 29 October 2026, IST  
**Development environment:** Antigravity on Windows  
**Initial state:** No existing application or source repository  
**Delivery strategy:** Five gated milestones with explicit user approval  
**Priority order:** Correctness, data integrity, functional completeness, usability, visual polish

---

## 1. Product Vision

Build a polished, dependable, single-page web application that acts as a personal command centre for Data Structures and Algorithms examination preparation.

The application must support:

- Complete syllabus tracking.
- Abstract Data Type implementation tracking.
- Algorithm implementation and testing inventories.
- Competitive programming practice records.
- Task management and daily study planning.
- A mental workspace for ideas, doubts, mistakes and insights.
- Revision planning and weak-topic identification.
- Exam countdown and actionable progress analytics.
- Local persistence, export, backup and recovery.

This is a working academic tool, not a static dashboard, marketing page or prototype populated with fabricated progress.

## 2. Product Decisions

These decisions are approved and should not be revisited without a material technical reason.

### 2.1 Application environment

- React + TypeScript + Vite.
- Runs locally in a browser.
- Single user; no authentication.
- Offline-friendly after application files and dependencies have been installed.
- No cloud backend or account system.
- No filesystem integration.
- No automatic interaction with external Windows directories.
- Study artifact paths are entered and tracked manually.
- Design the persistence boundary so a future storage adapter can be introduced without rewriting feature components.

The first release does not promise cross-device synchronisation or permanent storage independent of the browser.

### 2.2 Technology

- TypeScript in strict mode.
- Plain CSS with reusable components and centralised design tokens.
- localStorage as the initial persistence mechanism.
- Runtime data validation and versioned application state.
- Unit testing initially, expanding to integration and browser testing as functionality grows.
- Minimal dependencies and straightforward local development.

Do not introduce a large UI framework, cloud service or complicated state-management stack without a demonstrated need.

### 2.3 Persistence and recovery

- Autosave text-heavy edits with visible Saving, Saved and Save Error states.
- Version the application-state schema.
- Validate data before loading or committing it.
- Implement explicit schema migrations.
- Never overwrite valid existing data during initialisation.
- Seed initial academic records exactly once.
- Use stable IDs rather than array positions.
- Provide JSON export and validated import.
- Support merge and replace restore modes.
- Create a recoverable backup before destructive restoration.
- Track the last successful export and show a visible backup reminder.
- Handle invalid data and storage failures without silently discarding edits.

localStorage is not immune to browser data clearing, quota limitations or user actions. Explain these limitations in the interface or README.

### 2.4 Approved visual direction

Build a compact, information-dense developer productivity workspace.

- Light mode by default.
- Optional, reliable dark-mode toggle.
- Persistent desktop sidebar.
- Compact mobile navigation.
- High-contrast typography.
- Neutral backgrounds, restrained accent colours and subtle borders.
- Compact tables where they improve information density.
- Purposeful progress indicators.
- Keyboard accessibility and visible focus states.
- Clear empty, loading, saved and error states.

Avoid excessive rounded cards, neon gradients, unnecessary animations, decorative terminal windows, fake charts, oversized headings and nonfunctional buttons.

---

## 3. Application Structure

The application is a single-page application with in-app section switching.

Required navigation:

1. Overview.
2. Syllabus.
3. ADT Library.
4. Algorithm Library.
5. CP Practice.
6. Tasks and Study Plan.
7. Brain Dump.
8. Review and Analytics.

Overview is the default section.

The application must be responsive, usable on desktop, tablet and mobile, and avoid requiring the user to scroll through one enormous form.

## 4. Overview Requirements

Display information derived from actual persisted records:

- Configurable exam countdown.
- Required syllabus coverage.
- ADTs implemented and tested.
- Algorithms implemented and tested.
- CP problems attempted, independently solved and mastered.
- Today's tasks and the next recommended action.
- Upcoming and overdue tasks.
- Weak topics.
- Unresolved doubts and mistakes.
- Recent meaningful activity.
- Quick-add actions for tasks, notes and problems.
- Last successful backup/export information.

Do not hardcode progress metrics.

The countdown must use the system clock and configured exam date. Handle date boundaries and the passed-exam state without negative days remaining or broken calculations.

Initialise the exam date to 3 November 2026, but make it editable in settings.

## 5. Syllabus Master Tracker

Seed the complete syllabus below. Every topic must be represented by an editable record.

Recommended fields:

- Stable ID.
- Unit.
- Topic title.
- Description.
- Required or optional classification.
- Priority.
- Study status.
- Confidence rating from 1 to 5.
- Implementation status where applicable.
- Revision status.
- Configured completion requirements.
- Linked tasks, ADTs, algorithms and CP problems.
- Notes.
- Created and updated timestamps.

Required capabilities:

- Search, filtering and sorting.
- Unit, status, priority and type filters.
- Expandable topic details.
- Editable topics and custom topic creation.
- Progress summaries.
- Manual status changes.
- Task creation from a topic.
- Linking topics to implementation records and CP problems.
- Preservation of stable IDs and relationships during edits.

### UNIT I

**Foundations**
- Introduction to Data Structures.
- Need and Relevance.
- Abstract Data Types and Data Structures.
- Principles and Patterns.
- Basic Complexity Analysis.
- Best, Worst, and Average Cases.
- Asymptotic Analysis.
- Analyzing Programs.
- Space Bounds.
- Recursion.
- Linear Recursion.
- Binary Recursion.
- Multiple Recursion.

**Arrays, Linked Lists and Recursion**
- Using Arrays.
- Lists.
- Array-Based List Implementation.
- Linked Lists.
- Linked List ADT.
- Singly Linked List.
- Doubly Linked List.
- Circular Linked List.

**Stacks and Queues**
- Stack ADT.
- Array-Based Stack.
- Linked Stack.
- Implementing Recursion Using Stacks.
- Stack Applications.
- Queue ADT.
- Array-Based Queue.
- Linked Queue.
- Double-Ended Queue.
- Circular Queue.
- Queue Applications.

### UNIT II

**Trees**
- Tree Definition and Properties.
- Tree ADT.
- Basic Tree Traversals.
- Binary Tree.
- Data Structures for Representing Trees.
- Linked Structure for Binary Tree.
- Array-Based Tree Implementation.

**Priority Queues**
- Priority Queue ADT.
- Priority Queue Using Lists.
- Heaps.
- Heap Operations and Complexity.

**Maps and Dictionaries**
- Map ADT.
- List-Based Map Implementation.
- Hash Tables.
- Dictionary ADT.
- Hashing and Collision Handling.

**Skip Lists**
- Skip List Structure.
- Skip List Implementation.
- Skip List Complexity.

### UNIT III

**Search Trees**
- Binary Search Tree.
- BST Search, Insertion, and Deletion.
- AVL Tree.
- AVL Rotations.
- Segment Trees.
- Segment Tree Implementation.
- B-Trees.
- B-Tree Implementation.

**External Memory**
- External Memory Sorting.
- External Memory Searching.

**Graphs**
- Graph ADT.
- Graph Data Structures and Representations.
- Graph Traversal.
- Transitive Closure.
- Directed Acyclic Graphs.
- Weighted Graphs.
- Shortest Paths.
- Greedy Methods for Minimum Spanning Trees.
- Minimum Spanning Tree Algorithms.

Optional or advanced topics may be added without replacing these topics.

### Completion semantics

Topic completion is not equivalent to mastery.

Each topic must support configurable completion requirements. A requirement can reference specified tasks, ADT records, algorithms or an explicit manual confirmation.

- Topics with no configured requirements must not automatically become complete.
- Theoretical topics may use manual completion confirmation.
- Required-syllabus percentages exclude optional topics.
- Completion requirements must not create circular dependencies.
- Mastery is tracked separately through confidence and evidence.

## 6. ADT Implementation Inventory

Seed the following records.

**Linear structures**
- Array-Based List.
- Singly Linked List.
- Doubly Linked List.
- Circular Linked List.
- Array-Based Stack.
- Linked Stack.
- Array-Based Queue.
- Circular Queue.
- Linked Queue.
- Deque.

**Trees and priority structures**
- General Tree Representation.
- Binary Tree.
- Tree Traversals.
- List-Based Priority Queue.
- Heap-Based Priority Queue.
- Min-Heap.
- Max-Heap.
- Binary Search Tree.
- AVL Tree.

**Maps and advanced structures**
- List-Based Map.
- Hash Table.
- Skip List.
- Segment Tree.
- B-Tree.

**Graph representations**
- Adjacency List.
- Adjacency Matrix.
- Edge List.
- Weighted Graph Representation.

Each record should include:

- Name and related syllabus topics.
- File path.
- Implementation status.
- Essential operation checklist.
- Custom operations and test cases.
- Required test coverage and edge cases.
- Complexity notes.
- Known issues.
- Last tested timestamp.
- Optional linked tasks and algorithms.

Status progression:

NOT STARTED → IN PROGRESS → IMPLEMENTED → TESTED → MASTERED.

Users may move backwards in status.

### Essential operation examples

**Singly Linked List**
- Node class and traversal.
- Search.
- Insert at beginning, end and position.
- Delete at beginning, end and by value or position.
- Reverse.
- Empty-list and single-node handling.
- Complexity notes.

**Stack**
- Push, pop, peek/top, is-empty and size.
- Underflow handling.
- Array and linked implementations where applicable.

**Queue**
- Enqueue, dequeue, front, rear, is-empty and size.
- Empty-queue handling.
- Circular wraparound where applicable.

**BST**
- Search and insertion.
- Deletion of leaf, one-child and two-child nodes.
- Minimum and maximum.
- Traversals and height.
- Complexity in terms of tree height.

**AVL**
- Height maintenance and balance factor.
- LL, RR, LR and RL rotations.
- Insertion and search.
- Deletion if required by the course.

**Heap**
- Insert and peek.
- Extract minimum/maximum.
- Heapify up and down.
- Build heap.
- Complexity notes.

**Segment Tree**
- Build.
- Range query.
- Point update.
- Complexity notes.

**B-Tree**
- Search.
- Insertion.
- Node split.
- Deletion if required.
- Complexity notes.

A completed checklist must never automatically mark an ADT as tested.

Mastery may be recommended from evidence, but explicit user confirmation is required.

## 7. Algorithm Inventory

Seed these algorithms.

**Complexity and recursion**
- Asymptotic complexity analysis.
- Linear recursion examples.
- Binary recursion examples.
- Multiple recursion examples.
- Recursive binary search.

**Searching**
- Linear Search.
- Binary Search.

**Sorting**
- Bubble Sort.
- Selection Sort.
- Insertion Sort.
- Merge Sort.
- Quick Sort.
- Heap Sort.
- External Sorting / Multiway Merge.

**Tree algorithms**
- Preorder Traversal.
- Inorder Traversal.
- Postorder Traversal.
- Level-Order Traversal.
- Tree Height.
- Node and Leaf Counting.
- BST Search.
- BST Insertion and Deletion.
- AVL Rotations.

**Graph algorithms**
- Breadth-First Search.
- Depth-First Search.
- Warshall's Transitive Closure.
- Topological Sorting.
- Dijkstra's Shortest Path Algorithm.
- Prim-Jarník Minimum Spanning Tree.
- Kruskal's Minimum Spanning Tree.
- Disjoint Set / Union-Find if required.

Each algorithm record must contain:

- Name and category.
- Related data structures and syllabus topics.
- File path.
- Implementation status.
- Correctness-tested state.
- Sample-trace completion.
- Time and auxiliary-space complexity.
- Preconditions.
- Notes and common mistakes.
- Linked CP problems and tasks.

Dijkstra's algorithm must explicitly state its non-negative edge-weight precondition.

Optional algorithms must not inflate required-syllabus progress.

## 8. Competitive Programming Tracker

This is a problem log, not an embedded coding platform.

Fields:

- Problem title.
- Platform and URL.
- Topic and difficulty.
- Related data structures and algorithms.
- Date attempted.
- Status.
- Attempt count.
- Time spent in minutes.
- Independently solved: yes/no.
- Hint used: yes/no.
- Solution viewed: yes/no.
- Time and space complexity.
- Mistakes.
- Key insight.
- Revisit date.
- Notes.

Statuses:

- To Do.
- Attempted.
- Solved Independently.
- Solved With Hints.
- Editorial / Solution Studied.
- Needs Reattempt.
- Mastered.

Track separately:

- Total attempted.
- Independently solved.
- Solved with assistance.
- Needs reattempt.
- Mastered.

Only explicit user-recorded independent solves count as independent. Assistance and editorial viewing must remain visible and must not silently convert an assisted solve into an independent one.

Support filtering by platform, topic, difficulty, status and date.

Provide quick-add links for LeetCode, HackerRank, CodeChef and Other. Store user-supplied URLs; do not invent problem IDs.

## 9. Tasks and Study Planning

Task fields:

- Title and description.
- Category.
- Linked syllabus topic.
- Linked ADT, algorithm or CP problem.
- Priority.
- Status.
- Due date.
- Estimated and actual duration.
- Optional subtasks.
- Notes.
- Created and updated timestamps.

Categories:

- Learn.
- Implement.
- Test.
- Revise.
- CP Practice.
- Mock Exam.
- Admin.

Priorities: Critical, High, Medium, Low.

Statuses: To Do, In Progress, Blocked, Done.

Features:

- Today's tasks.
- Upcoming and overdue tasks.
- All tasks.
- Quick add, edit and delete.
- Reordering or reprioritisation.
- Filtering by priority, status, category and due date.
- Daily focus list.
- Estimate-versus-actual study time.
- Links to topics and implementation records.

Completing a task must not automatically complete its linked topic.

Support multiple tasks on the same day and calculate overdue status correctly.

Avoid a complex calendar in the first version.

## 10. Brain Dump

Support note types:

- Idea.
- Doubt / Question.
- Mistake.
- Concept Explanation.
- Important Insight.
- Exam Tip.
- Pending Research.

Each note contains:

- Optional title.
- Body.
- Type.
- Tags.
- Related syllabus topic.
- Related implementation or algorithm.
- Pin/favourite state.
- Resolved/unresolved state where applicable.
- Created and updated timestamps.

Features:

- Instant capture.
- Quick-add from any section.
- Autosave with explicit status feedback.
- Search and filtering.
- Pinning.
- Linking to tasks.
- Converting notes to tasks without deleting the original note.
- Converting unresolved doubts into revision tasks.
- Resolving doubts without deleting their history.

Do not require extensive metadata before a note can be saved.

## 11. Revision and Analytics

Provide:

- Required syllabus coverage by unit.
- ADTs implemented and tested.
- Algorithms implemented and tested.
- Independently solved CP problems.
- Unresolved doubts.
- Mistakes to revisit.
- Tasks completed over time.
- Recorded study time.
- Weak topics based on confidence.

Confidence scale:

1. Completely unfamiliar.
2. Understand with help.
3. Can implement with reference.
4. Can implement independently.
5. Can explain, trace and solve variations.

Use editable spaced-revision intervals.

Initially identify weak topics through low self-rated confidence. Avoid presenting time spent or checklist completion as proof of mastery.

All metrics must derive from actual records and have documented definitions.

## 12. Data Architecture and Persistence

Use a versioned, validated application-state model and centralise all persistence access.

Required behaviour:

- Stable IDs.
- Safe state updates.
- Validation before commits.
- Schema migrations.
- Idempotent seed initialisation.
- Preservation of user changes.
- Consistent timestamps.
- Serialised writes to avoid race conditions.
- Honest save status.
- Recoverable errors.
- Validated import.
- JSON export.
- Merge and replace restore modes.
- Safety backup before destructive restoration.
- Duplicate ID and relationship handling.
- Visible last-export information.

The storage adapter must not be embedded in feature components.

Keep records compact and avoid unnecessary duplication of linked information.

If localStorage proves insufficient, document the reason and request approval before changing the storage strategy.

## 13. Project Architecture

Adapt the structure to the actual implementation, but keep responsibilities separated.

Suggested layout:

src/
  app/
  components/
  features/
    overview/
    syllabus/
    adt-library/
    algorithm-library/
    cp-practice/
    tasks/
    brain-dump/
    analytics/
  lib/
    storage/
    validation/
    date/
    ids/
  types/
  data/
    seed/
  tests/

Avoid creating empty folders without a purpose.

Centralise domain enums, schema versions, date handling, ID generation and derived progress calculations.

Use semantic HTML, accessible labels, keyboard support and predictable state updates.

## 14. Quality Assurance

Test:

- Seed data initialises once.
- Existing user data is not overwritten.
- Updates survive refresh and application restart.
- Deletes persist correctly.
- Exported backups restore successfully.
- Invalid imports are rejected.
- Schema migrations preserve user data.
- Duplicate IDs are prevented or safely handled.
- Task CRUD and overdue calculations work.
- Task completion does not complete topics automatically.
- Required syllabus counts exclude optional topics.
- ADT and algorithm status transitions persist.
- CP independent and assisted counts remain distinct.
- Filters and search work together.
- Brain-dump autosave survives navigation and refresh.
- Note-to-task conversion preserves the note.
- Countdown handles date boundaries and the passed-exam state.
- No dead buttons or knowingly broken navigation remain.
- Keyboard focus and responsive layouts work.
- Type checking, linting, tests and production build pass.

Run browser tests where practical. Do not claim a check passed unless it was executed.

## 15. Acceptance Criteria

The finished application must:

1. Run locally using documented commands.
2. Provide all eight functional sections.
3. Seed the complete specified syllabus.
4. Seed all required ADT and algorithm records.
5. Support complete task management.
6. Support CP problem tracking.
7. Support instant note and doubt capture.
8. Calculate metrics from persisted records.
9. Preserve data across refreshes and restarts under normal browser conditions.
10. Support JSON export and validated restoration.
11. Support merge and replace restoration.
12. Calculate an editable exam countdown correctly.
13. Provide functional search and filtering.
14. Avoid dead controls and fabricated progress.
15. Pass available automated checks.
16. Document setup, execution, persistence, backups and limitations.
17. Provide an accessible, responsive, coherent UI.

## 16. Five-Milestone Delivery Plan

### M1: Foundation and Architecture
Initialise the project, configure tooling, define domain contracts, plan storage and migrations, build the application shell, and establish baseline tests.

### M2: Academic Data and Libraries
Seed and verify the syllabus, ADTs and algorithms. Implement their trackers, completion semantics and persistence integration.

### M3: Daily Study Workflows
Implement overview, countdown, tasks, CP tracking, brain dump, autosave and cross-linking.

### M4: Revision Intelligence and Recovery
Implement weak-topic tracking, revision scheduling, derived analytics, JSON export, validated restore, merge, replace and backup reminders.

### M5: QA, Hardening and Release
Complete integration and browser testing, accessibility, responsive design, error handling, final documentation and release verification.

Each milestone ends with an evidence-based report and explicit user approval before the next begins.

## 17. Explicit Non-Goals

Unless separately approved, do not implement:

- Cloud backend or synchronisation.
- Authentication or multiple accounts.
- Windows filesystem access.
- External directory synchronisation.
- Embedded coding execution or online judge integration.
- Paid services.
- Unnecessary dependencies.
- Complex calendar functionality.
- Decorative analytics.
- Unverified automatic mastery decisions.

The final product must remain a practical, maintainable personal DSA preparation workspace.
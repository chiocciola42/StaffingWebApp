# AI.md — Staffing Allocation Planner

# Code Quality - MANDATORY
- NEVER leave empty catch blocks. Always log the error or rethrow with context.
- NEVER leave stub implementations (e.g. `TODO`, `pass`, `throw new Error("not implemented")`).
- IMPORTANT: After any code change, run `npm test` and `npm run typecheck` before considering the task done.
- If a function cannot be fully implemented, ask for clarification instead of generating a stub.

## Workflow Orchestration

### 1. Plan Node Default
Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
If something goes sideways, STOP and re-plan immediately don't keep pushing Use plan mode for verification steps, not just building Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
Use subagents liberally to keep main context window clean
Offload research, exploration, and parallel analysis to subagents
For complex problems, throw more compute at it via subagents
One tack per subagent for focused execution

### 3. Self-Improvement Loop
After ANY correction from the user: update AI-Lessons.md with the pattern
Write rules for yourself that prevent the same mistake
Ruthlessly iterate on these lessons until mistake rate drops
Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
Run tests, check logs, demonstrate correctness
implement the "elegant solution"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
Skip this for simple, obvious fixes - don't over-engineer
Challenge your own work before presenting it

### 6. Autonomous Bug Fizing
When given a bug report: just fix it. Don't ask for hand-holding
Zero context switching required from the user
Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to AI-ToDo.md with checkable items
2. **Verify Plan**: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. **Document Results**: Add review section to AI-ToDo.md
6. **Capture Lessons**: Update AI-Lessons.md after corrections

## Core Principles
**Simplicity First**: Make every change as simple as possible. Impact minimal od No Laziness*: Find root causes. No temporary fixes. Senior developer standards.
**Minimat Impact**: Changes should onlv touch what's necessary. Avoid introducing bugs.

## Project Overview

A comprehensive staffing and resource allocation management application for planning, monitoring, and optimizing human resource allocation on company projects. The UI is in **Italian** — all labels, messages, and user-facing strings use Italian language.

**Tech stack:** React 19 + TypeScript + Tailwind CSS (Material Design 3) frontend with Vercel Serverless Functions backend and PostgreSQL (Vercel Postgres) database.

## Quick Reference

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # TypeScript type-check (tsc --noEmit) + Vite build
npm run test      # Run Vitest tests
npm run lint      # ESLint with zero warnings tolerance
npm run seed      # Seed database (requires .env.development.local)
```

## Project Structure

This is **not** a monorepo. Most source files live at the repository root rather than inside a `src/` directory.

```
.
├── App.tsx                  # Root component: routing, layout, providers
├── index.tsx                # React DOM entry point
├── index.html               # HTML shell
├── types.ts                 # All TypeScript interfaces/types (single file)
├── routes.ts                # Route manifest and navigation configuration
├── index.css                # Global styles + Tailwind + MD3 CSS variables
│
├── api/                     # Vercel Serverless Functions (backend)
│   ├── _lib/                # Shared server-side utilities (NOT serverless endpoints)
│   │   ├── db.ts            # PostgreSQL connection pool (@vercel/postgres)
│   │   ├── env.ts           # Centralized env var validation (throws on startup if missing)
│   │   ├── auth.ts          # JWT verification & RBAC authorization helpers
│   │   └── schema.ts        # Full database schema DDL + initialization
│   ├── data.ts              # Aggregated data fetch endpoint (/api/data)
│   ├── auth.ts              # Unified auth: login (JWT), login-protection config
│   ├── resources.ts         # Generic CRUD dispatcher for all entities (largest API file)
│   ├── config.ts            # Config/lookup value CRUD
│   ├── staffing.ts          # Allocations & assignments management
│   ├── admin.ts             # Admin utilities (webhook testing, integrations)
│   ├── import.ts            # Excel/data import
│   └── export.ts            # SQL dump export (postgres/mysql dialects)
│
├── components/              # Reusable React components
│   ├── forms/               # Form components (FormDialog, FormFieldFeedback, configs, types)
│   ├── sidebar/             # Sidebar sub-components (SidebarHeadless, SidebarItemFactory)
│   ├── shared/              # Shared utilities (ExportButton)
│   ├── __tests__/           # Component tests
│   ├── DataTable.tsx         # Primary data table component
│   ├── Modal.tsx             # Modal dialog
│   ├── ConfirmationModal.tsx # Confirmation dialog
│   ├── ExportModal.tsx       # Export functionality modal
│   ├── PdfExportButton.tsx   # PDF export button using jsPDF
│   ├── VirtualStaffingGrid.tsx  # Virtualized staffing grid (@tanstack/react-virtual)
│   ├── SearchWidget.tsx      # Global search palette (Cmd+K)
│   ├── SearchableSelect.tsx  # Searchable dropdown
│   ├── MultiSelectDropdown.tsx  # Multi-select component
│   ├── GraphDataView.tsx     # D3-based graph visualization
│   ├── DashboardDataTable.tsx # Dashboard-specific table
│   ├── Pagination.tsx        # Pagination component
│   ├── Toast.tsx             # Toast notification
│   ├── LoadingSkeleton.tsx   # Loading skeleton
│   ├── ErrorBoundary.tsx     # Error boundary
│   ├── Sidebar.tsx           # Main sidebar navigation
│   ├── BottomNavBar.tsx      # Mobile bottom navigation
│   └── icons.tsx             # Icon components library
│
├── pages/                   # Page-level components (lazy-loaded)
│   ├── __tests__/           # Page tests
│   ├── StaffingPage.tsx     # Core staffing grid
│   ├── DashboardPage.tsx    # Analytics dashboard
│   ├── ResourcesPage.tsx    # Resource management
│   ├── ProjectsPage.tsx     # Project management
│   ├── ClientsPage.tsx      # Client management
│   ├── RolesPage.tsx        # Role management
│   ├── ContractsPage.tsx    # Contract management
│   ├── WbsAllocationPage.tsx # WBS analysis
│   ├── RateCardsPage.tsx    # Rate card management
│   ├── ForecastingPage.tsx  # 12-month capacity planning
│   ├── SimulationPage.tsx   # What-if staffing scenarios
│   ├── WorkloadPage.tsx     # Resource workload view
│   ├── GanttPage.tsx        # Project timeline
│   ├── CalendarPage.tsx     # Company calendar
│   ├── ResourceRequestPage.tsx  # Recruitment requisitions
│   ├── InterviewsPage.tsx   # Interview tracking
│   ├── SkillsPage.tsx       # Skills management
│   ├── SkillsMapPage.tsx    # Skills map visualization
│   ├── SkillAnalysisPage.tsx # Skill gap analysis
│   ├── CertificationsPage.tsx # Certifications
│   ├── LeavePage.tsx        # Leave request management
│   ├── PerformanceTimeline.tsx  # Performance evaluations
│   ├── RevenuePage.tsx      # Revenue analysis
│   ├── ReportsPage.tsx      # Reports
│   ├── StaffingVisualizationPage.tsx  # D3 Sankey staffing viz
│   ├── ExportPage.tsx       # Data export
│   ├── ImportPage.tsx       # Data import
│   ├── NotificationsPage.tsx # Notifications
│   ├── NotificationSettingsPage.tsx  # Notification config
│   ├── AdminSettingsPage.tsx # Admin settings
│   ├── SecurityCenterPage.tsx # Security/user management
│   ├── DbInspectorPage.tsx  # Database inspector
│   ├── ConfigPage.tsx       # App configuration
│   ├── GlobalSearchPage.tsx # Full search results
│   ├── LoginPage.tsx        # Login
│   ├── UserManualPage.tsx   # Full user manual (Italian)
│   ├── SimpleUserManualPage.tsx # Simplified manual
│   └── TestStaffingPage.tsx # Dev/testing page (no registered route)
│
├── context/                 # React Context providers (state management)
│   ├── AppContext.tsx        # Coordinator: orchestrates domain sub-contexts, cross-domain cascade ops, backward-compat useEntitiesContext()
│   ├── ResourcesContext.tsx  # Domain: resources, roles, roleCostHistory, evaluations
│   ├── ProjectsContext.tsx   # Domain: projects, clients, contracts, assignments, rate cards, financial data
│   ├── SkillsContext.tsx     # Domain: skills, skill categories, resource/project skills, thresholds
│   ├── HRContext.tsx         # Domain: leave requests, leave types, resource requests, interviews
│   ├── LookupContext.tsx     # Domain: config options (functions, industries, seniority, etc.), company calendar, planning settings
│   ├── UIConfigContext.tsx   # Domain: sidebar config, notifications, dashboard layout, page visibility
│   ├── AuthContext.tsx       # Authentication state, JWT, RBAC
│   ├── ThemeContext.tsx      # Dark/light theme with MD3 tokens
│   ├── RoutesContext.tsx     # Navigation manifest, breadcrumbs, permissions
│   ├── ExportContext.tsx     # Export state
│   └── ToastContext.tsx      # Toast notifications
│
├── hooks/                   # Custom React hooks
│   ├── useAuthorizedResource.ts   # Authorization check hook
│   ├── useAuthorizedResource.test.ts
│   ├── useComputedSkills.ts       # Computed skill aggregation hook
│   ├── useExport.ts               # Export functionality
│   └── useGlobalSearch.ts         # Global search
│
├── services/                # API client
│   └── apiClient.ts         # HTTP client with auth and bounded retries
│
├── utils/                   # Utility modules
│   ├── api.ts               # authorizedFetch / authorizedJsonFetch helpers
│   ├── auth.ts              # getStoredAuthToken helper
│   ├── dateUtils.ts         # Date manipulation helpers
│   ├── costUtils.ts         # Cost/budget calculations
│   ├── exportUtils.ts       # Export to Excel (ExcelJS via excelAdapter)
│   ├── excelAdapter.ts      # SheetJS-compatible API implemented on ExcelJS
│   ├── exportTableUtils.ts  # Table-specific export helpers
│   ├── formatters.ts        # Data formatting
│   ├── paths.ts             # Route path constants
│   ├── pdfExport.ts         # PDF export orchestration (jsPDF)
│   ├── pdfExportUtils.ts    # PDF export helpers/utilities
│   └── webhookNotifier.ts   # Webhook notification integration
│
├── libs/
│   └── zod.ts               # Custom lightweight Zod-compatible validation library
│
├── config/
│   └── dashboardLayout.ts   # Dashboard widget layout config
│
├── scripts/
│   └── seed.js              # Database seeding (idempotent)
│
├── src/                     # Legacy/duplicate directory (excluded from TS compilation)
│   ├── pages/               # Contains only SkillAnalysisPage.tsx (duplicate)
│   └── routes.ts            # Duplicate routes file
│
├── tailwind.config.js       # Tailwind + MD3 color tokens via CSS variables
├── vite.config.ts           # Vite config (port 3000, path aliases)
├── tsconfig.json            # TypeScript config
├── postcss.config.js        # PostCSS (Tailwind + Autoprefixer)
├── vercel.json              # Vercel deployment (SPA rewrites)
├── metadata.json            # App metadata for deployment
└── package.json             # Dependencies and scripts
```

## Architecture & Key Patterns

### State Management

State is managed via **React Context** (no Redux/Zustand). The main provider hierarchy is:

```
HashRouter > ThemeProvider > ToastProvider > AppProviders > AuthProvider > ExportProvider > RoutesProvider
```

`AppProviders` internally nests all domain sub-context providers in this order:

```
AppStateContext → AllocationsContext → ResourcesProvider → ProjectsProvider
→ SkillsProvider → HRProvider → LookupProvider → UIConfigProvider → AppCoordinator
```

#### Domain Context Split

`AppContext.tsx` was refactored from a monolithic store into a **coordinator** that orchestrates six domain-specific sub-contexts. This prevents cascade re-renders when unrelated state changes.

| Context file | Manages |
|---|---|
| `ResourcesContext.tsx` | `resources`, `roles`, `roleCostHistory`, `evaluations` |
| `ProjectsContext.tsx` | `projects`, `clients`, `contracts`, `assignments`, `rateCards`, billing milestones, WBS tasks, project expenses |
| `SkillsContext.tsx` | `skills`, `skillCategories`, `skillMacroCategories`, `resourceSkills`, `projectSkills`, `skillThresholds` |
| `HRContext.tsx` | `leaveRequests`, `leaveTypes`, `resourceRequests`, `interviews` |
| `LookupContext.tsx` | `functions`, `industries`, `seniorityLevels`, `projectStatuses`, `clientSectors`, `locations`, `companyCalendar`, `planningSettings` |
| `UIConfigContext.tsx` | `sidebarConfig`, `quickActions`, `notifications`, `dashboardLayout`, `pageVisibility`, `notificationConfigs/Rules` |

`AppContext.tsx` (the coordinator) still:
- Owns `allocations` state (cross-domain, complex cascade)
- Performs the bulk `/api/data` fetch and distributes data to each sub-context via their `initialize()` callbacks
- Handles cross-domain cascade deletes (`deleteProject`, `deleteResource`) that touch multiple sub-contexts
- Exposes `useEntitiesContext()` for **backward compatibility** — new code should use the domain-specific hooks instead

#### Consuming state — preferred patterns

```typescript
// Preferred — domain-specific hooks (no unnecessary re-renders)
import { useResourcesContext } from '@/context/ResourcesContext';
import { useProjectsContext } from '@/context/ProjectsContext';
import { useSkillsContext } from '@/context/SkillsContext';
import { useHRContext } from '@/context/HRContext';
import { useLookupContext } from '@/context/LookupContext';
import { useUIConfigContext } from '@/context/UIConfigContext';

// Legacy / backward-compat — still works but causes wider re-renders
import { useEntitiesContext } from '@/context/AppContext';
```

### Routing

- Uses **HashRouter** (`/#/path`) for compatibility with sandbox/preview environments.
- All pages are **lazy-loaded** via `React.lazy()` with `Suspense` fallbacks.
- Some named exports require the `.then(module => ({ default: module.NamedExport }))` pattern in lazy imports.
- RBAC is enforced via `DynamicRoute` wrapper that checks `AuthContext.hasPermission(path)`.
- Route metadata (labels, icons, sections, breadcrumbs) is defined in `routes.ts` and consumed via `RoutesContext`.
- **Entity-level visibility** is enforced via `AuthContext.hasEntityVisibility(entity)` on each page. See [Authentication & Authorization](#authentication--authorization) for details.

### API Layer

**There are only a handful of actual API files.** Most entity CRUD is routed through `api/resources.ts`, not separate per-entity files:

- **`/api/data`** — Bulk read: fetches all entities for initial load. Accepts `?scope=all|metadata|planning`.
- **`/api/auth`** — Unified authentication endpoint: `POST` for login (username/password → JWT); `GET ?action=config` reads login-protection flag; `POST ?action=config` (ADMIN) toggles login protection.
- **`/api/resources?entity=<type>`** — Generic CRUD dispatcher (31 entity types). Handles `resources`, `projects`, `clients`, `roles`, `skills`, `skill_categories`, `leaves`, `app_users`, `rate_cards`, `billing_milestones`, `resource_requests`, `interviews`, `contracts`, `assignments`, `allocations`, `role_entity_visibility`, and more via the `TABLE_MAPPING` and `VALIDATION_SCHEMAS` maps inside `resources.ts`. The `role_entity_visibility` entity supports a special bulk-save `POST` with `{ visibilityRules: RoleEntityVisibility[] }` body (ADMIN only).
- **`/api/config?type=<type>`** — CRUD for lookup/config values (functions, seniority levels, locations, etc.).
- **`/api/staffing`** — Dedicated endpoint for allocations and assignments: `POST ?action=allocation` for bulk upsert/delete; `POST ?action=assignment` to create/get an assignment; `DELETE ?action=assignment&id=<uuid>` to delete an assignment (cascades to allocations).
- **`/api/admin`** — Admin utilities: `POST ?action=webhook-test` sends a test Adaptive Card (Teams format) to a webhook URL.
- **`/api/import`** — Bulk data import from Excel/JSON. Requires operational role (ADMIN/MANAGER/SENIOR MANAGER/MANAGING DIRECTOR).
- **`/api/export`** — Full SQL dump export: `GET ?dialect=postgres|mysql` (ADMIN only).

#### API shared library (`api/_lib/`)

Server-side utilities shared across Vercel functions live in `api/_lib/`. Files here are **not** serverless endpoints:

- **`api/_lib/db.ts`** — PostgreSQL connection pool (`@vercel/postgres`). Import `db` from here in all API handlers.
- **`api/_lib/env.ts`** — Validates required env vars (`JWT_SECRET`, `POSTGRES_URL`) at startup and throws if missing. Import typed `env` object from here instead of raw `process.env`.
- **`api/_lib/auth.ts`** — Shared JWT verification helpers: `verifyAdmin(req)` asserts ADMIN role; `getUserFromRequest(req)` extracts user `{ id, username, role }` from Bearer token. Exports `OPERATIONAL_ROLES` (`['ADMIN', 'MANAGER', 'MANAGER_EXT', 'SENIOR MANAGER', 'SENIOR MANAGER_EXT', 'ASSOCIATE DIRECTOR', 'ASSOCIATE DIRECTOR_EXT', 'MANAGING DIRECTOR', 'MANAGING DIRECTOR_EXT']`) and `ALL_MANAGEABLE_ENTITIES` (the single-source-of-truth entity list for visibility control).
- **`api/_lib/schema.ts`** — Full database schema DDL. `ensureDbTablesExist()` is called lazily on first request. Includes `role_entity_visibility` table seeded with all non-ADMIN roles × all manageable entities, `is_visible = TRUE` by default (backward-compatible).

API calls use `apiFetch()` from `services/apiClient.ts` which handles auth headers (Bearer JWT from `localStorage`), and bounded retries with exponential backoff.

### Database

- **PostgreSQL** via `@vercel/postgres` connection pool.
- Connection configured in `api/_lib/db.ts` using `POSTGRES_URL` or `NEON_POSTGRES_URL` env var (validated in `api/_lib/env.ts`).
- Schema is defined in `api/_lib/schema.ts` — raw SQL DDL, no ORM. `ensureDbTablesExist()` is called lazily on first request.
- Database seeding: `scripts/seed.js` (run via `npm run seed`). Idempotent — safe to run multiple times.
- Tables use `snake_case` naming. IDs are UUID strings generated via `uuid` package.
- `api/data.ts` performs `snake_case → camelCase` conversion on all DB results before returning JSON.

### PDF Export

- PDF export uses **jsPDF** (`jspdf`) + **jspdf-autotable** for tabular data.
- Export orchestration lives in `utils/pdfExport.ts` and helpers in `utils/pdfExportUtils.ts`.
- The `components/PdfExportButton.tsx` component provides the UI trigger for PDF downloads.
- Multi-page PDFs (up to 11 pages) can include charts sourced from **QuickChart.io** as base64 images.

### Styling

- **Tailwind CSS** with **Material Design 3** (MD3) theming.
- Colors are defined as CSS custom properties (`--color-primary`, etc.) in `index.css` and mapped in `tailwind.config.js`.
- Dark mode via `class` strategy (`dark` class on root element).
- Font: **Manrope** (sans-serif) via Google Fonts.
- Surface elevation uses MD3 surface container tokens (`surface-container-low`, `surface-container-high`, etc.).
- Icons: **Material Symbols Outlined** from Google Fonts CDN (referenced as `<span className="material-symbols-outlined">icon_name</span>`).

### Validation

- The project uses a **custom lightweight Zod-compatible library** at `libs/zod.ts` (aliased as `zod` in both tsconfig and Vite config).
- This is NOT the full `zod` package — it's a minimal subset supporting: `object`, `string`, `boolean`, `enum`, `number`, `array`, `optional/nullable`, `refine`, `safeParse`.
- Import `zod` as usual — the alias resolves to the local implementation.
- The custom lib is used on both the **frontend** (form validation) and **backend** (`api/resources.ts` uses `z` from `'../libs/zod.js'`).

### Authentication & Authorization

- JWT-based auth with `bcryptjs` password hashing.
- JWT secret stored in `JWT_SECRET` environment variable (required in production; validated at startup in `api/_lib/env.ts`).
- Auth token stored in `localStorage` as `authToken`.
- Auth state in `AuthContext.tsx` — provides `login`, `logout`, `changePassword`, `hasPermission`, `hasEntityVisibility`.
- Force password change on first login (`mustChangePassword` flag on user object).
- `utils/auth.ts` exports `getStoredAuthToken()`. `utils/api.ts` exports `authorizedFetch`/`authorizedJsonFetch` as lower-level alternatives to `apiFetch()`.

#### RBAC — Three Layers

| Layer | Table | Enforced by | Scope |
|---|---|---|---|
| 1. Route permissions | `role_permissions` | `DynamicRoute` + `hasPermission()` | Page-level: which routes a role can access |
| 2. Operation permissions | `OPERATIONAL_ROLES` constant | API checks in `api/resources.ts` | Write operations: only operational roles can create/update/delete |
| 3. Entity visibility | `role_entity_visibility` | `canSee()` in `api/data.ts`, GET/POST/PUT/DELETE guard in `api/resources.ts`, `hasEntityVisibility()` in pages | Data-level: which entity types a role can see/write |

**Roles:** `SIMPLE`, `SIMPLE_EXT`, `MANAGER`, `MANAGER_EXT`, `SENIOR MANAGER`, `SENIOR MANAGER_EXT`, `ASSOCIATE DIRECTOR`, `ASSOCIATE DIRECTOR_EXT`, `MANAGING DIRECTOR`, `MANAGING DIRECTOR_EXT`, `ADMIN`. ADMIN always bypasses all checks.

#### Entity Visibility (Layer 3)

The `role_entity_visibility` table controls which entity types each role can see. Managed via the **"Entity Visibility"** pillar in `pages/SecurityCenterPage.tsx`.

- **At login** (`api/auth.ts`): visible entity list is fetched for the user's role and returned in the login response as `entityVisibility: string[]` (stored client-side in `localStorage['authUser']`).
- **At bulk fetch** (`api/data.ts`): `canSee(entity)` helper filters all returned data per role.
- **At individual GET** (`api/resources.ts`): Entity-level guard returns `403` if the requesting role lacks visibility.
- **At write operations** (`api/resources.ts`): POST/PUT/DELETE also enforce entity visibility via `checkEntityVisibility()` — a role without visibility on an entity cannot create, update, or delete records of that type.
- **At page render** (per-page): `hasEntityVisibility(entity)` from `useAuth()` shows a lock screen instead of the data table.
- **Backward compatibility**: missing rows in `role_entity_visibility` default to visible (`true`). Old sessions without `entityVisibility` field also default to full visibility.

**Manageable entities** (defined in `ALL_MANAGEABLE_ENTITIES` constant in `api/_lib/auth.ts`): `resources`, `projects`, `clients`, `assignments`, `allocations`, `contracts`, `rate_cards`, `skills`, `roles`, `leaves`, `resource_requests`, `interviews`, `wbs_tasks`, `billing_milestones`, `resource_evaluations`.

**Dependency constraints** (enforced by UI validation before save):
```
allocations        → requires assignments
assignments        → requires resources + projects
interviews         → requires resource_requests
leaves             → requires resources
billing_milestones → requires contracts
wbs_tasks          → requires clients
resource_evaluations → requires resources
contracts          → requires projects + clients
```

**Pages with entity visibility guards** (pattern: all hooks first, then `if (!hasEntityVisibility('...')) return <LockScreen />`):
`ResourcesPage`, `ProjectsPage`, `ContractsPage`, `RateCardsPage`, `ResourceRequestPage`, `InterviewsPage`, `LeavePage`, `SkillsPage`, `SkillsMapPage`, `PerformanceTimeline`, `WbsAllocationPage`, `WorkloadPage`.

**IMPORTANT — React Hooks Rule:** When adding a visibility guard to a new page, always call `useAuth()` (and all other hooks) BEFORE the `if (!hasEntityVisibility(...)) return (...)` guard. Never place a hook call after an early return.

## TypeScript Conventions

- **All types** are defined in the root `types.ts` file — there is no per-module type splitting.
- Interfaces use `PascalCase` (e.g., `Resource`, `Project`, `Allocation`).
- Entity IDs are optional `string` fields (`id?: string`) — generated server-side. **Exception:** `Resource.id` is a required `string`.
- The `Allocation` type is a two-level nested map:
  ```typescript
  interface Allocation {
    [assignmentId: string]: {
      [date: string]: number; // percentage (0–100)
    };
  }
  ```
- Skill levels are 1–5 mapped to `NOVICE | JUNIOR | MIDDLE | SENIOR | EXPERT` via `SKILL_LEVELS` constant in `types.ts`.

### Path Aliases

- `@/*` resolves to the project root (e.g., `@/components/Modal`).
- `zod` resolves to `./libs/zod` (the custom implementation).

### TypeScript Configuration

- Target: ES2022, Module: ESNext, JSX: react-jsx.
- `noEmit: true` — TypeScript is used for type-checking only; Vite handles compilation.
- The `api/`, `scripts/`, test files, and `src/` are **excluded** from the frontend TypeScript compilation (`tsconfig.json` exclude list).

## Code Conventions

- **Language:** UI strings, comments, and documentation are predominantly in **Italian**.
- **Component style:** Functional components with hooks. No class components.
- **File naming:** `PascalCase` for components/pages (`StaffingPage.tsx`), `camelCase` for utilities (`dateUtils.ts`).
- **Exports:** Pages use both default and named exports. Some lazy imports use `.then(module => ({ default: module.NamedExport }))` pattern.
- **JSDoc:** File-level `@file` / `@description` comments (in Italian) are used on major files.
- **CSS:** Tailwind utility classes inline. MD3 semantic color tokens preferred over raw color values.
- **No Prettier config** — formatting follows defaults.
- **ESLint:** Strict mode (`--max-warnings 0`). TypeScript ESLint + React Hooks + React Refresh plugins.

## Testing

- **Framework:** Vitest + @testing-library/react + jsdom.
- **Test locations:**
  - `components/__tests__/` — component snapshot tests
  - `pages/__tests__/validationSchemas.test.ts` — validation schema tests
  - `hooks/useAuthorizedResource.test.ts` — co-located hook test
- **Run:** `npm run test` (Vitest in watch mode).
- Test coverage is minimal — limited to a few components, hooks, and validation schemas.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Yes (prod) | PostgreSQL connection string |
| `NEON_POSTGRES_URL` | Fallback | Alternative Postgres connection string |
| `JWT_SECRET` | Yes (prod) | Secret for signing/verifying JWT tokens |
| `GEMINI_API_KEY` | No | Optional AI integration key (exposed to frontend) |

- Use `.env.development.local` for local development (git-ignored via `*.local` pattern).
- The `.env.example` file exists but is currently empty.
- In production, `api/_lib/env.ts` validates `JWT_SECRET` and `POSTGRES_URL` at cold-start and throws if either is absent.

## Deployment

- **Platform:** Vercel.
- **Frontend:** SPA built by Vite, deployed to CDN. All non-API routes rewrite to `index.html` (see `vercel.json`).
- **Backend:** Each file in `/api/` (excluding `_lib/`) becomes a serverless function endpoint.
- **Database:** Vercel Postgres (or Neon Postgres).

## Key Domain Concepts

- **Resource** — An employee/consultant that can be allocated to projects.
- **Project** — A client engagement with budget, timeline, and staffing needs.
- **Assignment** — Links a resource to a project (no role/date on the join itself — dates live in allocations).
- **Allocation** — Daily percentage of a resource's time allocated to a project, keyed by `assignmentId > date > percentage`.
- **Function** (formerly "Horizontal") — Business function/department a resource belongs to (e.g., Technology, Finance).
- **Seniority Level** — Career level (e.g., Junior, Senior, Manager).
- **Contract** — Legal agreement with CIG/WBS codes and billing type (T&M or Fixed Price).
- **Rate Card** — Daily billing rates per resource.
- **Resource Request** — Recruitment requisition for new hires. Status: `ATTIVA | STANDBY | CHIUSA`.
- **Interview** — Candidate record linked to a resource request. Feedback: `Positivo | Positivo On Hold | Negativo`.
- **WbsTask** — WBS (Work Breakdown Structure) financial entry tied to a client.
- **Skill** — Individual competency, optionally a certification. Proficiency level 1–5.
- **Leave Request** — Employee time-off request. Status: `PENDING | APPROVED | REJECTED`.

## Common Tasks

### Adding a new page

1. Create the page component in `pages/NewPage.tsx`.
2. Add a lazy import in `App.tsx`.
3. Add a `<Route>` entry wrapped in `<DynamicRoute>` in `AppContent`.
4. Register the route in `routes.ts` with label, icon, section, and permissions.

### Adding a new entity type

**If the entity can use the generic CRUD dispatcher (`api/resources.ts`):**
1. Add a `TABLE_MAPPING` entry (frontend entity name → DB table name) in `api/resources.ts`.
2. Add a `VALIDATION_SCHEMAS` entry with a Zod schema in `api/resources.ts`.
3. Define the TypeScript interface in `types.ts`.
4. Choose the appropriate domain context and add state + CRUD operations there.
5. Add the entity to the `initialize()` call in `AppContext.tsx` coordinator.
6. Include the entity in `api/data.ts` bulk fetch, wrapping the return with `canSee('entity_key') ? data : []`.
7. If the entity should be visibility-controlled: add it to `ENTITY_VISIBILITY_CONTROLLED` in `api/resources.ts` (line ~636), to `MANAGEABLE_ENTITIES` in `SecurityCenterPage.tsx`, to the DB seed in `api/_lib/schema.ts`. Optionally add any dependency rules to `ENTITY_VISIBILITY_DEPS`.
8. Add a `hasEntityVisibility('entity_key')` guard to the page component (after all hooks, before the main return).

**If the entity needs a dedicated endpoint:**
1. Create a new file in `api/` (e.g., `api/my-endpoint.ts`). Do **not** put it inside `api/_lib/`.
2. Export a default async handler: `export default async function handler(req, res)`.
3. Import `db` from `api/_lib/db.ts` and `env` from `api/_lib/env.ts`.
4. The endpoint is automatically available at `/api/my-endpoint` on Vercel.

### Adding a new API endpoint

1. Create a new file in `api/` (e.g., `api/my-endpoint.ts`).
2. Export a default async handler: `export default async function handler(req, res)`.
3. Import `db` from `api/_lib/db.ts` and `env` from `api/_lib/env.ts` for database/env access.
4. The endpoint is automatically available at `/api/my-endpoint` on Vercel.

### Running locally

A PostgreSQL database (`POSTGRES_URL`) and `JWT_SECRET` are required; see `.env.example`.

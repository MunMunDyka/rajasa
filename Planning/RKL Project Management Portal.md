# RKL Project Management Portal
## Prototype Planning & Agent Instructions

> **Project Status:** Customer Demo / Prototype  
> **Client:** PT Rajasa Kemenangan Logistik  
> **Current Goal:** Build a polished interactive prototype for customer presentation.  
> **Important:** Keep infrastructure minimal, but the backend IS implemented for real
> (PostgreSQL + Prisma). Do not build anything listed as out of scope in Section 33.
> **Last decision review:** 29 Aug 2026.

> **Start here.** Section 0 is the locked decisions - read it before anything
> else, and treat it as overriding any older wording further down. Section 0b is
> where the work currently stands and what comes next. Sections 1-40 are the
> original requirements and remain the specification.

---

# 0. Decision Log

Locked decisions. Where this section conflicts with anything later in the document,
this section wins.

| # | Decision | Rationale |
|---|---|---|
| D1 | **Monolith Next.js.** The API lives in Route Handlers + Server Actions inside `frontend/`. The `backend/` folder is unused and will be removed. | One process, one deploy, no CORS. Business logic is isolated in `src/server/services/` so it can be extracted into a standalone API later without a rewrite. |
| D2 | **PostgreSQL + Prisma from day one** - not mock JSON, not SQLite. Hosted on **Supabase** during the demo phase; self-hosted on the VPS at go-live. | Real relational data from the start with zero local database install while requirements are still moving. Supabase is used as a plain Postgres endpoint and nothing else, so the switch is a connection-string change. See README, "Go-Live Migration". |
| D3 | **Auth.js (NextAuth v5)**, credentials provider + bcrypt, JWT session, role carried in the token. | Enough for the demo and already production-shaped. |
| D4 | **Uploads on disk** at `/srv/rkl/uploads` in production (`./storage/uploads` in dev), outside the code directory. Metadata in Postgres. Every download goes through a route handler that checks the caller's role. | The VPS disk is persistent, file paths are not guessable, and a deploy never overwrites client files. |
| D5 | **Two distinct file kinds:** Project Document vs Progress Evidence. See Section 7. | Reconciles the CEO's "only CEO + Accountant upload" with the Engineer's need to attach evidence to a progress report. |
| D6 | **Role switcher in the topbar** for demo mode, in addition to the real login page. | Demo scenario 38 switches role three times; logging out and back in each time kills the presentation. |
| D7 | **Document Requirements checklist is in scope.** See Section 19b. | This is the core of the CEO's request: upload *kebutuhan dokumen*, not merely documents. |
| D8 | **Two deployment phases.** Demo phase: runs locally against Supabase Postgres. Go-live phase: Sumopod VPS (Ubuntu, root SSH, persistent NVMe) with Node + PM2 + Nginx + Certbot + Postgres from apt. No Docker in either phase. | Defer server work until the client actually approves. The migration is a documented half-day, not a rewrite. |
| D9 | **No Supabase SDK.** `@supabase/supabase-js`, Supabase Auth and Supabase Storage are forbidden dependencies. Auth stays Auth.js; files stay on local disk behind the `storage` abstraction. | This is the entire reason D2 costs nothing to reverse. Importing the SDK turns a connection-string change into a rewrite. |

## Rule that keeps D1 reversible

Files under `src/server/services/` **must not import from `next/*`**.

Business logic stays framework-free, so if a separate backend is ever genuinely needed
(native mobile app, separate backend team, independent API scaling), extracting it is a
folder move plus an HTTP layer - not a rewrite.

---

# 0b. Build Status

Updated 30 Aug 2026. Keep this section current - it is the handover point for
whoever picks the work up next.

## Done

**Foundation**

```text
Next.js 16.3.3 / React 19.2 / TypeScript / Tailwind 4
shadcn/ui, radix-nova preset, 27 components + a hand-written form.tsx
PostgreSQL on Supabase, Prisma 7.10 with the pg driver adapter
Brand theme sampled from the logo, expressed as OKLCH tokens
```

**Auth**

```text
Auth.js v5, credentials provider, JWT session, role carried in the token
Config split: database-free half for the proxy, full half for Node
Role + capability guards in src/server/auth/guards.ts
Demo role switcher, gated on both DEMO_MODE and User.isDemo
```

**Data**

```text
9 models, migration 20260829152327_init applied
Idempotent seed, refuses to run unless DEMO_MODE=true
5 users, 6 projects, 16 documents, 48 requirements
Seed writes real PDF and PNG files to disk, so preview never 404s
```

**Pages** - every route below returns 200 for every role that should reach it:

```text
/login                    brand panel, demo account hints, password reveal
/dashboard                4 counters, project table, attention list, activity
/projects                 URL-driven search + status filter
/projects/[id]            tabs: Ringkasan / Progress / Dokumen / Aktivitas
/documents                all documents the viewer may see
/documents/finance        finance categories only
/activity                 full activity feed
/users                    admin only, read-only listing
/settings                 admin only, app config + document categories
/api/files/[id]           streams a file after re-checking the viewer's access
```

Plus `error.tsx` and `not-found.tsx` inside the app shell, so no unhandled
failure or missing record ever shows a raw Next error page during a demo.

**Document upload** - the first write path in the system:

```text
POST /api/projects/[id]/documents
Dialog on the project detail page, for CEO / Accountant / Admin only
Optionally marks a requirement as fulfilled in the same action
Role check in the service, not the route
Document row + ActivityLog written in one transaction
Stored file deleted again if that transaction fails, so a failed upload
  never leaves an orphaned file on disk
```

**User administration** - admin only, the second write path:

```text
Create, edit identity and role, reset password, activate / deactivate
No delete: ActivityLog.actorId is onDelete Restrict, so a user with history
  cannot be removed - deactivation keeps project history attributable
Guards, all enforced in the service and verified by test:
  - only ADMIN may act
  - an admin cannot change their own role or deactivate themselves
  - the last active admin cannot be demoted or deactivated
  - email is unique and normalised to lowercase
  - passwords are bcrypt-hashed, never echoed into the activity log
New ActivityAction values: USER_CREATED / UPDATED / ACTIVATED /
  DEACTIVATED / PASSWORD_RESET (migration 20260829211838)
```

**Dashboard layout** - project summary on the left; activity and the attention
list stacked on the right. Activity shows five entries at a time with a compact
pager, because the dashboard is a glance and the full history lives at
/activity. Sidebar narrowed to 14rem; the labels are short and the rest was
gutter.

**Visual system and file preview**

```text
Full application redesign aligned to the logo's navy, maroon, and neutral tones
Geist typography fixed; the previous circular font token no longer falls back to serif
White operational sidebar, responsive project tables, and a compact 2x2 mobile dashboard
Project list is the selection surface; full project content only appears after opening one
Authenticated image and PDF previews open inside a large in-app dialog
The same preview works in Documents, project Documents, and progress evidence
390px mobile QA completed with no horizontal page overflow
```

**Performance pass**

```text
Dashboard statistics, project table, and attention list now share one project query
Login background served as a 115 KB WebP instead of the original 2.4 MB JPEG
Measured warm /login response: about 105 ms in dev and 27 ms in production locally
```

**Project document upload MVP**

```text
CEO, Admin, and Accountant see Upload Dokumen immediately after opening a project
The dialog accepts PDF/JPG/PNG, a document name, category, and optional requirement
Files are stored through the storage abstraction; metadata and activity are transactional
An optional requirement moves to fulfilled as part of the same transaction
The uploaded item appears in the project list and uses the existing protected preview
Engineer standalone uploads are rejected server-side; progress evidence stays separate
```

## Verified by request, not by inspection

```text
Route x role            every combination returns 200, or a rendered refusal
Engineer isolation      404 on another team's project AND on its files
                        the assigned engineer gets 200 for the same ids
contractValue           never serialised into the HTML for an Engineer
Anonymous access        every app route redirects to /login
Bad ids                 404, indistinguishable from "not yours"
Document upload         CEO upload 201, appears in project, protected PDF preview 200
Engineer upload         rejected 403 before a file is written
tsc, eslint, next build all clean
```

## Verified visually

```text
Desktop application shell, dashboard, project list, and project detail at 1416px
Mobile dashboard, project list, project detail, and documents at 390px
All four project-detail tabs fit in the 390px viewport
Image preview renders through /api/files/[id] in an 1152px desktop dialog
PDF preview mounts the protected file in the same dialog via an iframe
```

## Next, in priority order

1. **Update Progress (Engineer).** Dialog on desktop, sheet on mobile:
   percentage, description, date, evidence upload. Writes a ProgressUpdate,
   refreshes `Project.currentProgress` and the ActivityLog in one transaction.
   This is the centre of demo scenario 38 and the largest remaining gap - the
   only step in the primary demo script that cannot be performed yet. Follow
   the shape of the document upload path in document-service; the hard parts
   (role check in the service, transaction with the activity log, deleting the
   stored file if the transaction fails) are already solved there.
2. **Create Project (Admin / CEO).** Seeds requirements from the template so a
   brand new project immediately reads 0/6 - the live moment in the demo.
   Assigning the PIC belongs here too; user administration exists now, but
   nothing yet attaches a user to a project from the UI.
3. **Progress chart** on the project Progress tab. recharts is installed and
   currently unused; `toChartSeries()` in progress-service already shapes data.
4. **Document filters** on /documents: category, project, kind. Reuse the
   URL-driven pattern from ProjectFilters rather than inventing a second one.
5. **Delete document** (Admin, soft delete, with confirmation).
6. **Playwright** coverage of the three demo flows in section 10.
7. **Mobile pass** at 390px, especially the tables and the progress dialog.

## Known gaps

```text
Write flows finished so far: project document upload, user administration.
Progress cannot be updated from the UI - the seed is the only source of
  progress history. This blocks the primary demo scenario in section 38.
Projects cannot be created from the UI, and project members cannot be
  assigned or removed from the UI.
Settings is a read-only listing; the app name and document categories
  cannot be edited yet.
DEMO_MODE must be "true" for the role switcher, the demo account hints
  and npm run db:seed. Next reads .env only at startup, so changing it
  requires a dev server restart - it is not picked up by hot reload.
public/brand/background.jpg is 2.4 MB; compress it before go-live.
```

---

# 1. Project Objective

Build a modern web-based **Project Document & Progress Management Portal** for PT Rajasa Kemenangan Logistik.

The system is centered around **Projects**.

Each project can contain:

- Project information
- Assigned engineers
- Progress updates
- Progress evidence
- Images
- PDF documents
- Engineering documents
- Financial documents
- Activity history

The primary business goal is to allow management to monitor project progress and documents from one centralized system.

The first version is a **customer-facing prototype**.

Prioritize:

1. UX
2. UI quality
3. Clear project workflow
4. Responsive/mobile experience
5. Realistic demo interactions

Do NOT prioritize:

- complex production infrastructure
- complete notification infrastructure
- payment systems
- enterprise-level file security
- advanced accounting
- full audit implementation
- microservices

---

# 2. Application Name

Temporary application name:

**RKL ProjectHub**

Alternative internal project name:

`rkl-projecthub`

The application name must be configurable so it can be changed later.

---

# 3. Technology Stack

Use the following stack.

## Frontend

```text
Next.js (App Router)
TypeScript
Tailwind CSS
shadcn/ui
lucide-react
recharts
```

## Backend

| Concern | Choice |
|---|---|
| API | Next.js Route Handlers + Server Actions |
| Database | PostgreSQL - Supabase during the demo phase, self-hosted at go-live |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5), credentials + bcrypt, JWT session |
| Validation | Zod, one schema shared by the form and the API |
| File storage | Local disk behind a `storage` abstraction, swappable for S3 later |
| Process manager | PM2 |
| Reverse proxy | Nginx + Certbot |
| E2E tests | Playwright |

Deliberately NOT used: Docker, NestJS, S3/MinIO, tRPC, Redis, or a state-management
library for server data. Add any of these only when a concrete need appears.

Use the latest stable versions that are mutually compatible.

Before using a library API, consult current documentation using Context7 when necessary.

---

# 4. UI / Design Workflow

The interface must NOT look like a generic AI-generated dashboard.

Use:

```text
OpenDesign
+
shadcn/ui
```

Workflow:

```text
OpenDesign
    ↓
Design direction
Layout
Typography
Spacing
Visual hierarchy
Colors
Interaction ideas

    ↓

shadcn MCP
    ↓
Actual components
Dialog
Card
Button
Badge
Table
Dropdown
Tabs
Form
Sheet
Sidebar
etc.
```

## Agent Design Rule

Before implementing a major page:

1. Understand the functional requirement.
2. Use OpenDesign for design direction/reference.
3. Determine appropriate shadcn components.
4. Search/install components using shadcn MCP.
5. Compose the page.
6. Verify responsive behavior.
7. Test with Playwright.

Do not create custom components when an appropriate shadcn component already exists.

Custom components are allowed when they represent business-specific UI.

Example:

```text
<ProjectProgressCard />
<ProjectTimeline />
<DocumentPreview />
```

---

# 5. Visual Identity

The system should follow PT Rajasa Kemenangan Logistik's existing corporate identity.

Brand colors sampled from the actual logo file (`public/brand/LogoPT.png`):

```text
Maroon    #7A1211    brand accent
Navy      #0A2133    primary
Ink       #111827    body text
Surface   #FFFFFF    cards, panels, dialogs
App BG    #F5F6F8    page background
Border    #E4E7EC    dividers, card borders
Muted     #667085    secondary text

Success   #157F3D
Warning   #B7791F
Critical  #B42318
Info      #175CD3
```

Note: the logo is maroon-dominant with navy secondary. The UI must invert that weighting
so the logo stays the reddest element on screen.

Do not overuse the red/maroon color.

Use navy primarily for:

- sidebar
- navigation emphasis
- important headings
- brand identity

Use maroon primarily for:

- accents
- selected states
- primary actions where appropriate
- brand highlights

The application should feel:

```text
Corporate
Professional
Clean
Modern
Operational
Trustworthy
```

Avoid:

```text
Overly colorful UI
Huge gradients
Excessive glassmorphism
Gaming-style UI
Large decorative animations
Generic AI dashboard aesthetics
```

---

# 6. Responsive Design

The application must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

Desktop is the primary experience.

Mobile must still allow engineers to:

```text
View assigned projects
Open project detail
Update progress
Add notes
Upload images
Upload PDF documents
```

The system may later become a PWA.

Therefore, UI architecture should already be mobile-friendly.

---

# 7. User Roles

Prototype the following roles.

## Permission Matrix

The system stores two distinct kinds of files, and roles have different rights over each.
This is decision D5 and it overrides any looser wording further down this section.

| | **Project Document**<br>contract, invoice, PO, report, permit | **Progress Evidence**<br>photo or PDF attached to a progress update |
|---|---|---|
| **ADMIN** | Upload, edit metadata, delete | View |
| **CEO** | Upload, view all | View |
| **ACCOUNTANT** | Upload (finance categories), view | View |
| **ENGINEER** | **View only** | **Upload**, as part of a progress update |

Rules:

- An Engineer never uploads a standalone Project Document. Engineer evidence is always
  attached to a ProgressUpdate, never free-floating.
- Only an Engineer assigned to a project may submit a progress update for it.
- CEO and Admin see every project. Engineer sees assigned projects only.
  Accountant sees every project but only acts on documents.
- Delete is Admin-only in the prototype, and deletes are soft (`deletedAt`).

The one-line explanation for the client demo:

> "An Engineer cannot add official project documents. They only attach evidence to their
> own progress report."

## ADMIN

Responsibilities:

- Manage users
- Manage projects
- Assign users to projects
- View all projects
- Manage documents
- Manage basic configuration

Access:

```text
Dashboard
Projects
Documents
Users
Settings
```

---

## CEO

Main purpose:

**Monitoring**

The CEO should immediately understand company/project conditions from the dashboard.

Access:

```text
Executive Dashboard
All Projects
Project Details
Progress
Documents
Financial Documents
Recent Activity
```

CEO may also upload documents.

The CEO interface should prioritize information instead of administrative controls.

---

## ENGINEER

Main purpose:

**Project execution and progress updates**

Engineer can:

```text
View assigned projects
View project information
Update project progress
Write progress notes
Upload progress evidence (image / PDF) attached to a progress update
View previous updates
View project documents, read-only
```

Engineer can NOT:

```text
Upload standalone project documents
Upload financial documents
Delete any file
See projects they are not assigned to
```

Engineer must NOT see unnecessary administrative menus.

---

## ACCOUNTANT

Main purpose:

**Project financial documentation**

Accountant can:

```text
View projects
View project progress
Upload financial documents
Upload invoices
Upload purchase orders
Upload payment evidence
View financial document history
```

Do NOT create a full accounting system.

Finance in this prototype means:

> Financial document management related to projects.

---

# 8. Navigation

Navigation must change based on user role.

## Admin

```text
Dashboard

Projects
Documents

Users

Settings
```

## CEO

```text
Executive Dashboard

Projects
Documents

Recent Activity
```

## Engineer

```text
Dashboard

My Projects
Documents
```

## Accountant

```text
Dashboard

Projects
Financial Documents
```

---

# 9. Main User Flow

## CEO Flow

```text
Login
 ↓
Executive Dashboard
 ↓
See project overview
 ↓
See active / delayed / completed projects
 ↓
Select a project
 ↓
Project Detail
 ↓
Review progress
 ↓
Review progress timeline
 ↓
Review uploaded documents
 ↓
Preview PDF / Image
```

---

# 10. Engineer Flow

```text
Login
 ↓
My Projects
 ↓
Select Project
 ↓
Project Detail
 ↓
Update Progress
 ↓
Progress 50% → 65%
 ↓
Write Progress Description
 ↓
Upload Image / PDF Evidence
 ↓
Save
 ↓
Progress Timeline Updated
```

---

# 11. Accountant Flow

```text
Login
 ↓
Projects
 ↓
Select Project
 ↓
Financial Documents
 ↓
Upload Document
 ↓
Select Category
 ↓
Invoice / PO / Payment / Other
 ↓
Save
```

---

# 12. Prototype Pages

Build the prototype in the following order.

---

## PAGE 01 — Login

Route:

```text
/login
```

Content:

```text
RKL Logo

RKL ProjectHub

Email
Password

Login
```

Provide demo accounts.

Example:

```text
CEO
ceo@demo.local

Engineer
engineer@demo.local

Accountant
accountant@demo.local

Admin
admin@demo.local
```

Passwords may be simple demo credentials.

---

# 13. PAGE 02 — Executive Dashboard

Route:

```text
/dashboard
```

Primary audience:

```text
CEO
Admin
```

Dashboard cards:

```text
Total Projects

Active Projects

Completed Projects

Projects Requiring Attention
```

Example:

```text
Total Projects
18

In Progress
10

Completed
6

Requires Attention
2
```

Additional sections:

### Project Overview

Table:

```text
Project
Engineer PIC
Progress
Target Date
Status
```

Example:

```text
MV Rajasa Maintenance
Budi Santoso
65%
30 Sep 2026
In Progress
```

### Projects Requiring Attention

Show:

```text
Delayed projects

Projects close to deadline

Projects without recent progress
```

### Recent Activity

Example:

```text
Budi updated progress
50% → 65%

Finance uploaded Invoice-008.pdf

Engineer uploaded inspection-report.pdf
```

---

# 14. PAGE 03 — Projects

Route:

```text
/projects
```

Display projects using a professional data table.

Columns:

```text
Project Code

Project Name

PIC / Engineer

Start Date

Target Date

Progress

Status

Last Updated
```

Features:

```text
Search

Status Filter

Progress Filter

Sort

Open Project
```

Possible status:

```text
Planning

In Progress

On Hold

Completed

Cancelled
```

Delayed should preferably be an indicator derived from:

```text
target date passed
AND
progress < 100%
```

rather than a manually selected project status.

---

# 15. PAGE 04 — Project Detail

Route:

```text
/projects/[id]
```

This is one of the most important pages.

Header:

```text
Project Name

Project Code

Status

Current Progress

Engineer PIC

Start Date

Target Completion
```

Use tabs.

```text
Overview

Progress

Documents

Activity
```

---

# 16. Project Overview Tab

Show:

```text
Project Description

Project Information

Current Progress

Assigned Team

Important Dates

Latest Progress Update

Document Summary
```

Example:

```text
Current Progress

█████████████░░░░░░

65%
```

Show:

```text
Last Updated:
29 Aug 2026

Updated By:
Engineer Budi
```

---

# 17. Progress Tab

Show a chronological progress timeline.

Example:

```text
29 Aug 2026
65%

Engine room inspection completed.

Uploaded:
inspection.jpg
inspection-report.pdf


25 Aug 2026
50%

Replacement process started.


17 Aug 2026
30%

Required materials arrived.
```

Visualize historical progress using a simple chart if appropriate.

Do NOT only store/display the current percentage.

Progress updates represent historical records.

---

# 18. Update Progress

Engineer must have an action:

```text
Update Progress
```

Open using Dialog / Sheet depending on screen size.

Fields:

```text
Progress Percentage

Progress Description

Progress Date

Evidence Upload

Images

PDF
```

Example:

```text
Previous Progress
50%

New Progress
65%

Description
Engine room inspection completed.

Evidence
inspection.jpg
inspection-report.pdf
```

After Save:

```text
Project current progress updates to 65%

Timeline receives a new entry

Recent Activity receives an entry
```

For prototype, local/mock state is acceptable.

---

# 19. Documents Tab

Project documents belong to a Project.

Display:

```text
Document Name

Category

File Type

Uploaded By

Upload Date

Actions
```

Supported prototype formats:

```text
PDF

JPG

JPEG

PNG
```

Categories:

```text
Engineering

Progress Evidence

Report

Invoice

Purchase Order

Payment

Contract

Photo

Other
```

Do not hardcode categories throughout components.

Keep categories centralized/configurable in `src/config/`.

---

# 19b. Document Requirements (Kelengkapan Dokumen)

This is the CEO's headline request and it must be visible at a glance, not buried in a tab.

Each project carries a checklist of the documents it is REQUIRED to have.
Admin and CEO define the list; anyone with upload rights fulfills it.

A requirement holds:

```text
Label            e.g. "Kontrak Kerja", "BAST", "Invoice Termin 1"
Category
Mandatory        true / false
Due Date         optional
Fulfilled By     link to an uploaded Document, or empty
```

Derived status per requirement:

```text
Fulfilled     a document is linked
Outstanding   no document yet
Overdue       due date passed and still not fulfilled
```

Derived per project: `fulfilledMandatory / totalMandatory`, for example `7/10`.

Surface it in three places:

```text
Project Detail  ->  Documents tab, above the document list
Project List    ->  a "Docs" column showing 7/10 with a colored badge
Exec Dashboard  ->  a "Projects with incomplete documents" card
```

New projects seed their requirements from a template so the standard list is present from
the start. Keep the template in `src/config/`, never hardcoded inside components.

---

# 20. Document Detail / Preview

Allow users to preview:

```text
PDF

Image
```

without requiring a download first.

Document detail should show:

```text
Document Name

Project

Category

Uploaded By

Upload Date

Description

File Type

File Size
```

Actions:

```text
Preview

Download

Edit Metadata

Delete
```

Delete may be hidden based on role.

---

# 21. Upload Document

Use:

```text
Dialog
or
Sheet
```

Fields:

```text
Project

Document Category

Document Name

Description

File
```

Optional:

```text
Document Number

Document Date
```

Do NOT force:

```text
Expiry Date
```

for every document.

Some documents such as:

```text
Invoice
Photo
Progress Evidence
```

do not require expiry.

---

# 22. Financial Documents

This can initially reuse the Document system.

Financial categories:

```text
Invoice

Purchase Order

Payment Evidence

Financial Report

Other Finance
```

Do NOT build:

```text
General Ledger

Accounting Journal

Balance Sheet

Tax System

Payment Gateway

Budget Engine
```

unless explicitly requested later.

---

# 23. Activity Timeline

Every important prototype action should create activity data.

Examples:

```text
Progress updated

Document uploaded

Document deleted

Project created

Engineer assigned
```

Display:

```text
User

Action

Time

Project

Related Object
```

Example:

```text
29 Aug 2026 • 16:42

Budi Santoso
updated project progress

50% → 65%

MV Rajasa Maintenance
```

---

# 24. Demo Data

Create realistic mock data.

Do NOT use:

```text
Project 1

User 1

Lorem Ipsum
```

Use believable corporate demo data.

Example projects:

```text
MV Rajasa Engine Maintenance

Docking Preparation Project

Marine Equipment Inspection

Port Logistics Support

Vessel Electrical Maintenance

Safety Equipment Replacement
```

Example users:

```text
Budi Santoso
Engineer

Andi Wijaya
Engineer

Siti Rahma
Accountant

Management
CEO
```

The data must clearly be demo data and must not claim to be actual company records.

---

# 25. Data Layer

Real PostgreSQL from day one (decision D2). There is no mock JSON layer.

```text
UI (server component / client component)
 |
 v
Service   (src/server/services/*)
 |
 v
Prisma
 |
 v
PostgreSQL
```

Rules:

- Components never touch Prisma directly. UI calls a service; only services call Prisma.
- All business logic lives in `src/server/services/` and those files must not import
  from `next/*`. This is what keeps decision D1 reversible.
- Route handlers and server actions stay thin: authenticate, validate with Zod,
  call a service, map the result.
- Every mutating service call writes an `ActivityLog` row inside the same transaction,
  so the activity feed can never drift out of sync with the data.
- Demo data is seeded through `prisma/seed.ts` using the realistic content in Section 24.
  The seed must be idempotent and safe to re-run right before a demo.

Services expected:

```text
services/
    project-service.ts
    progress-service.ts
    document-service.ts
    requirement-service.ts
    activity-service.ts
    user-service.ts
```

---

# 26. Suggested Project Structure

```text
frontend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   └── brand/LogoPT.png
│
├── storage/uploads/          # dev only, gitignored; /srv/rkl/uploads in production
│
└── src/
    ├── app/
    │   ├── (auth)/login/
    │   ├── (app)/
    │   │   ├── dashboard/
    │   │   ├── projects/[id]/
    │   │   ├── documents/
    │   │   ├── users/
    │   │   └── settings/
    │   └── api/
    │       ├── auth/[...nextauth]/
    │       └── files/[id]/       # role-checked preview / download
    │
    ├── components/
    │   ├── layout/
    │   ├── dashboard/
    │   ├── projects/
    │   ├── progress/
    │   ├── documents/
    │   └── ui/               # shadcn generated
    │
    ├── server/
    │   ├── services/         # business logic. NO next/* imports.
    │   ├── db/               # prisma client singleton
    │   ├── storage/          # file put / get / delete abstraction
    │   └── auth/             # auth config, session helpers, role guards
    │
    ├── lib/
    ├── config/               # app name, document categories, requirement templates
    └── types/
```

Avoid gigantic page components.

Business-specific features should be separated into reusable components.

---

# 27. TypeScript Rules

Avoid:

```typescript
any
```

unless absolutely necessary.

Create proper domain types.

Examples:

```typescript
Project

User

ProgressUpdate

Document

DocumentCategory

ActivityLog

UserRole
```

Example:

```typescript
type UserRole =
  | "ADMIN"
  | "CEO"
  | "ENGINEER"
  | "ACCOUNTANT";
```

---

# 28. Component Rules

Use shadcn components where appropriate.

Expected usage includes:

```text
Sidebar

Button

Card

Badge

Dialog

Sheet

Tabs

DataTable

DropdownMenu

Avatar

Progress

Form

Input

Textarea

Select

Calendar

Tooltip

Breadcrumb

AlertDialog
```

Use icons consistently.

Prefer Lucide icons if compatible with the selected stack.

Do NOT mix multiple icon libraries without a reason.

---

# 29. UX Rules

Every important operation should provide feedback.

Examples:

```text
Loading state

Empty state

Success toast

Error toast

Confirmation dialog

Disabled state

Skeleton
```

Examples:

Uploading:

```text
Uploading document...
```

Success:

```text
Document uploaded successfully.
```

Delete:

```text
Are you sure you want to delete this document?
```

---

# 30. Empty States

Do not leave blank areas.

Example:

```text
No progress updates yet.

Progress updates submitted by the assigned engineer will appear here.
```

Example:

```text
No documents uploaded.

Upload the first document for this project.
```

---

# 31. Mobile UX

On mobile:

Sidebar should become:

```text
Drawer / Sheet
```

Tables may become:

```text
Horizontal scroll

or

Responsive cards
```

Engineer actions must remain easy to use.

Prioritize mobile use for:

```text
Update Progress

Upload Image

Upload Document

View Project
```

---

# 32. Future PWA Compatibility

Do not fully implement advanced offline features yet.

However, avoid architecture that prevents future PWA support.

Future goals:

```text
Install to Home Screen

App Icon

Standalone Mode

Push Notifications

Mobile-first progress updates
```

Do NOT cache confidential PDFs offline by default.

---

# 33. Explicit Out of Scope

Do not implement unless separately requested.

```text
Full ERP

Accounting Engine

Payroll

HRIS

Inventory

Purchase Workflow

Automatic WhatsApp Messaging

AI Document Extraction

OCR

Native Android Application

Native iOS Application

Subscription / Billing

Multi-tenant SaaS

Complex cloud architecture
```

---

# 34. Development Order

Follow this order.

## Phase 1 — Foundation

```text
Next.js project (TypeScript, Tailwind, App Router)

shadcn/ui init + base components

PostgreSQL running locally

Prisma schema + first migration

Seed script with demo data

Application layout: theme tokens, sidebar, navbar, responsive shell
```

---

## Phase 2 — Design System

Using OpenDesign:

```text
Determine typography

Determine color usage

Determine spacing rules

Determine page width

Determine card design

Determine data table design

Determine mobile behavior
```

Create consistent design tokens.

Do not independently redesign each page.

---

## Phase 3 — Authentication

Implement real credential login with Auth.js (decision D3).

Roles:

```text
Admin
CEO
Engineer
Accountant
```

Navigation and available actions change based on the session role.

Also implement the demo role switcher (decision D6): a topbar control, visible only when
`DEMO_MODE=true`, that re-signs the session as another demo user without a logout round
trip. It must be trivially disableable for production.

---

## Phase 4 — CEO Dashboard

Build:

```text
Statistics

Project overview

Project attention list

Recent activity

Progress visualization
```

---

## Phase 5 — Projects

Build:

```text
Project List

Search

Filter

Project Detail
```

---

## Phase 6 — Progress

Build:

```text
Progress timeline

Progress history

Progress chart

Update Progress dialog

Evidence upload interface
```

---

## Phase 7 — Documents

Build:

```text
Documents list

Upload interface

Categories

PDF preview

Image preview

Document metadata
```

---

## Phase 8 — Role Experience

Verify:

```text
CEO

Engineer

Accountant

Admin
```

each sees the correct navigation and actions.

---

## Phase 9 — Responsive QA

Test:

```text
1440px desktop

1366px laptop

Tablet

390px mobile
```

---

## Phase 10 — Browser QA

Use Playwright.

Test at least:

```text
Login CEO

Open Dashboard

Open Project

Navigate Progress

Open Document Preview

Logout

Login Engineer

Open My Projects

Update Progress

Upload Evidence

Verify new progress

Logout

Login Accountant

Open Project

Upload Financial Document
```

---

# 35. MCP Usage Rules

## OpenDesign

Use for:

```text
Design direction

Visual hierarchy

Layout exploration

Typography

Spacing

Design critique
```

Do NOT blindly copy unrelated visual references.

Adapt them to a corporate logistics/project-management application.

---

## shadcn MCP

Use when:

```text
Searching components

Installing components

Searching blocks

Looking for recommended composition patterns
```

Before manually implementing common UI, check shadcn first.

---

## Context7

Use whenever current documentation is required for:

```text
Next.js

React

Tailwind

shadcn

Zod

React Hook Form

and other dependencies
```

Do not rely on outdated remembered APIs when Context7 is available.

---

## Playwright MCP

Use after features become interactive.

Use it for:

```text
Browser navigation

Interaction testing

Forms

Responsive checks

Role flows

Regression checks
```

---

# 36. Agent Behavioral Rules

IMPORTANT.

The agent must:

```text
Read this PLANNING.md before major implementation.

Follow existing architecture.

Do not replace the agreed stack.

Do not introduce unnecessary libraries.

Do not implement out-of-scope features.

Prefer shadcn components.

Maintain TypeScript quality.

Keep components reasonably small.

Keep business logic outside UI where practical.

Run lint/type checks regularly.

Test important flows.
```

## Two rules that are not negotiable

```text
1. Files under src/server/services/ must NOT import from next/*.
   This is what keeps decision D1 reversible. See Section 0.

2. No Supabase SDK - @supabase/supabase-js, Supabase Auth, Supabase Storage.
   Supabase is a plain Postgres endpoint and nothing else. See decision D9
   and "Forbidden dependencies" in the repository README.
```

## Before finishing a piece of work

```text
Run: npm run typecheck && npm run lint && npm run build
Update Section 0b: move what you finished into Done, and re-order what is next.
Add a decision to Section 0 if you made one that future work must respect.
```

A stale Section 0b is worse than none, because the next person trusts it. If you
changed what the system does, the section describing what the system does changes
in the same commit.

If a requirement is ambiguous:

Choose the simplest implementation compatible with the prototype goal.

Do NOT expand scope without explicit instruction.

---

# 37. Prototype Definition of Done

The customer prototype is considered ready when:

- Login screen is polished
- CEO dashboard looks presentation-ready
- Project list works
- Project detail works
- Progress history is visible
- Engineer can simulate updating progress
- Image/PDF evidence can be demonstrated
- Documents can be browsed
- PDF/image preview is available
- Accountant financial-document flow can be demonstrated
- Roles show appropriate navigation
- Desktop UI is polished
- Mobile layout is usable
- No obvious console errors
- Core demo flows pass browser testing

---

# 38. Primary Demo Scenario

This scenario must work particularly well.

```text
CEO LOGIN
    ↓
Dashboard
    ↓
See Project at 65%
    ↓
Open Project
    ↓
Review progress + documents
```

Then:

```text
ENGINEER LOGIN
    ↓
My Projects
    ↓
Open same Project
    ↓
Update 65% → 75%
    ↓
Add progress description
    ↓
Upload image evidence
    ↓
Save
```

Then:

```text
CEO LOGIN
    ↓
Dashboard
    ↓
Project now shows 75%
    ↓
Recent Activity shows Engineer update
```

This is the main customer demonstration flow.

---

# 39. Current Priority

```text
SCHEMA + FOUNDATION
   |
   v
CORE FLOWS  (projects, progress, documents, requirements)
   |
   v
DESIGN POLISH
   |
   v
DEPLOY TO SUMOPOD
   |
   v
CUSTOMER DEMO
   |
   v
CUSTOMER FEEDBACK
```

Deferred until AFTER customer feedback:

```text
Notification system (email / WhatsApp)
Backup automation beyond a daily pg_dump cron
PWA production setup
Object storage migration
Fine-grained audit trail
Multi-tenant support
```

Do not prematurely optimize a system whose requirements have not yet been approved by
the customer.

---

# 40. Deployment Target

Two phases (decision D8). The full step-by-step migration checklist lives in the
repository `README.md` under "Go-Live Migration" - keep that file as the single source
of truth for the switch, and update it whenever a phase-dependent choice is made.

## Phase A - Demo (current)

```text
App        runs locally (npm run dev / npm run build && npm start)
Database   Supabase Postgres, Southeast Asia (Singapore) region
Files      ./storage/uploads on the developer machine
Auth       Auth.js, DEMO_MODE=true, role switcher enabled
```

Known and accepted trade-offs while in Phase A: cross-region query latency, no database
backups on the free tier, and the Supabase project auto-pauses after 7 days of inactivity
(resume it from the dashboard the day before any demo).

## Phase B - Go-live (after client approval)

Sumopod VPS, Jakarta region, Ubuntu with root SSH and persistent NVMe storage.

Recommended tier: **2 vCPU / 4 GB**. Do not use the 2 GB tier - `next build` is likely to
run out of memory while Postgres is running on the same box.

Server layout:

```text
/srv/rkl/app        deployed code
/srv/rkl/uploads    uploaded files, never touched by a deploy
/srv/rkl/backups    daily pg_dump output
```

Stack on the box:

```text
Node (via nvm)   application runtime
PM2              process manager, pm2 startup for reboot survival
PostgreSQL       apt package, local socket only, never exposed to the internet
Nginx            reverse proxy to the Node process
Certbot          HTTPS
```

Deploy step:

```bash
git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 reload rkl
```

Operational must-haves before showing the client:

```text
Daily pg_dump cron + rsync of /srv/rkl/uploads
.env lives on the server only, never committed
PM2 configured to restart on reboot
HTTPS with a real domain
Postgres NOT listening on 0.0.0.0
```

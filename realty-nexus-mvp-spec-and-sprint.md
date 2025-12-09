# Realty Nexus — MVP Product Specification + Sprint 1 Backlog

Last updated: 2025-12-09

## 0. One-line summary
Multi-tenant SaaS real-estate CRM (Realty Nexus) for builders to list properties, manage sales teams and leads, and let customers browse and enquire. Tenants pay via subscription plans; billing integration deferred to Phase 2 (recording only in MVP).

## 1. High-level goals for MVP
- Deliver end-to-end flow: Director registers builder → Super Admin verifies → Director/Admin posts properties → public users enquire → leads appear in property CRM → Salespersons (joined via joining code) manage leads.
- Enforce tenancy isolation (organizationId) via application context + DB/RLS policies.
- Implement secure joining-code onboarding for Admin & Salesperson.
- Implement public property feed, property details, enquiry creation, CRM lead lifecycle, and Super Admin verification panel.
- Record billing & plan selection in DB but do not enforce billing limits until Phase 2 (enforcement flags and usage counters recorded).

## 2. Tech decisions for MVP (default; confirm any changes)
- Frontend: Next.js (TypeScript), React.
- API: Next.js API routes + tRPC (typed contracts).
- ORM/DB: Prisma + PostgreSQL (Neon / RDS / Supabase).
- Tenant isolation: organizationId column on tenant data + Postgres Row-Level Security (RLS) policies.
- Auth: Phone OTP primary; email/password optional. (Please confirm OTP provider: Firebase Auth or custom OTP via Twilio/Razorpay/region provider.)
- Realtime chat: Firestore recommended (per your doc) for speed of implementation. Option: socket/chat microservice later. (Please confirm.)
- File storage: S3 / Firebase Storage stub for alpha (uploads saved to private bucket, public URLs for images).
- Background jobs / queues: Redis/BullMQ (deferred, optional).
- CI/CD: GitHub Actions (tests, build, staging deploy to Vercel).

## 3. Core data model (Prisma/postgres style — key fields)
- Organization (BuilderOrg)
  - id (uuid), name, slug, about, verified (boolean), plan, billingId, logoUrl, createdAt, updatedAt
- User
  - id (uuid), name, phone, email, type (user|job_seeker|builder_user), createdAt, updatedAt
- RoleMapping
  - id, userId, organizationId, role (director|admin|sales), createdAt
- Property
  - id, organizationId, name, address, lat, lng, type, subtype, statusTags JSON, photos JSON[], videoUrls JSON[], brochureUrl, price, assignedSalespersons JSON[], isLuxury boolean, createdAt
- Lead
  - id, organizationId, propertyId, userId, source, status, assignedSalespersonId, comments JSON[], scheduledVisitAt, createdAt, updatedAt
- JoiningCode / PendingInvite
  - code, role (builder_admin|builder_sales), organizationId, propertyId nullable, status (pending|accepted|expired), invitedByUserId, createdAt, acceptedAt
- Payment/Subscription (recorded only)
  - id, organizationId, providerCustomerId (stripe/razorpay), plan, status, currentPeriodStart, currentPeriodEnd
- StaffRequest
  - id, organizationId, propertyId, type (3d|standee), status, staffAssignedId, paymentStatus, createdAt

## 4. Important security rules & enforcement
- All builder/CRM endpoints require an organization context.
- Postgres RLS: create policies to allow reads/writes only if row.organizationId matches current session org_id claim. System roles (super_admin & support staff) have bypass.
- Max 2 salespersons per property must be enforced transactionally when adding assignment or accepting a joining code (check in DB and reject/expire code if exceeded).
- Legal documents stored in private storage and accessible only to staff endpoints (signed URLs with limited TTL).
- Audit logs for sensitive actions: verification, suspend/delete org or property, joining code acceptance, payment changes.

## 5. Acceptance criteria (detailed, testable)
These are the "must pass" tests for the MVP.

5.1 Onboarding & Verification
- Director registration: submitting the Builder registration form creates an organization entry with status verification_pending and a RoleMapping for the Director as builder_director.
- Super Admin can view a verification queue, inspect uploaded documents, and mark Verified. When Verified, organization.verified becomes true and verified badge is visible on public builder profile.
- Unverified builders are limited to recorded trial/free plan constraints (2 properties, 1 salesperson/property, 25 enquiries/month recorded in usage counters).

5.2 Role selection & joining codes
- After OTP login, a new user sees the role selection screen with Register as Builder / Register as Customer / Other (I have a code).
- Director creates Admin by generating an Admin joining code stored as pending_invite with role=builder_admin and organizationId set.
- The Admin candidate logs in with OTP, selects Other → Login as Admin → enters the code; system validates pending invite, creates/updates user, links RoleMapping role=builder_admin for organizationId, sets invite status to accepted, and redirects to the Admin dashboard.
- Similarly for Salesperson: invite includes propertyId; on acceptance, RoleMapping role=builder_sales created and property assignment recorded; redirect goes to CRM for that property.
- If joining code is stale/expired or assignment would exceed 2 salespersons, acceptance is rejected.

5.3 Property management
- Director/Admin can CRUD properties; POST /properties requires mandatory fields plus min 3 photos. Save as draft allowed.
- AssignedSalespersons array size <= 2 on DB constraint and validation.
- Photos limit enforced per property (min 3 max 8) and per plan counts recorded.

5.4 Public property feed, search & details
- Public feed: pagination, search by name/location/type; property detail page loads with photos and builder name/about and verified badge if applicable.
- Enquiry button creates a Lead with source=web_enquiry, status=new, propertyId and organizationId set. Contact info is not public unless user initiates enquiry -> then contact provisioned for that interaction.

5.5 CRM & Leads
- Leads created from public enquiries are visible to assigned salesperson(s) for that property and to Director/Admin for the builder org.
- Salesperson sees only leads related to properties they are assigned to (via RoleMapping & assignedSalespersons).
- Lead lifecycle: supports status transitions, comments, scheduledVisitAt. CRM exposes change history in crm_activities.
- Salesperson can schedule visits and add notes. Notifications are triggered (email stub) on new leads.

5.6 Super Admin panel
- Super Admin can: review verification queue; mark verify/reject; suspend org (which makes org.active=false and hides their properties); delete org/property (logged in audits).
- Super Admin sees summary counts: total orgs, pending verifications, active properties, leads per org (basic).

5.7 Privacy & job seekers
- Job seeker contact details visible only to builder Director/Admin when searched by tag. Saving job seeker profiles generates jobSeekerId visible in builder search.
- User contact revealed to Salesperson only for the specific enquiry.

5.8 Persisting billing plan data
- Payment/Subscription rows exist and record plan name and dates. No billing enforcement required in Sprint 1 beyond counters and recorded plan.

## 6. Sprint 1 — 2-week backlog (Goal: alpha end-to-end)

Sprint goal
Deliver a working alpha: Director onboarding → Super Admin verification → Create property → Public enquiry → Lead visibility to Salesperson(s) using joining-code flows; include RLS tests and staging deploy.

Assumptions
- Team: 2 engineers (full-stack), 1 designer (minimal).
- Payment integration deferred; file uploads/storages and emails use stubs for alpha.

Sprint length: 10 working days

Day-by-day breakdown (tasks, owners, acceptance tests)

Day 0: Repo & infra prep (init)
- Task: Create repo skeleton (Next.js TypeScript + tRPC + Prisma), ESLint, Prettier, Husky, basic README, .env.example.
- Acceptance: repo builds locally; dev README works.
- Owner: infra/dev lead.

Day 1: Auth & User model
- Task: Implement OTP stub & email/password login (auth middleware), User model in Prisma + migrations.
- Acceptance: register/login flow works using OTP stub; user record created.
- Note: For production, swap OTP stub with provider; confirm provider choice.

Day 2: Organization model & RoleMapping + Admin UI stub
- Task: Prisma Organization + RoleMapping models; endpoints to create organization (Director registration); admin dashboard stub.
- Acceptance: Director registration creates organization row with verification_pending and RoleMapping with role=director.

Day 3: Postgres RLS & tenancy context middleware
- Task: Implement organization context middleware and RLS policy SQL migration scripts for development DB.
- Acceptance tests: (1) Query without org context denied by RLS; (2) With org context returns rows; automated test included.

Day 4: Super Admin verification queue & docs storage stub
- Task: Upload stub flow for legal docs (local storage), Super Admin verification UI & endpoints (approve/reject).
- Acceptance: Super Admin can view pending builders and mark verified → organization.verified true; audit log entry created.

Day 5–6: Property model & CRUD UI
- Task: Implement Property Prisma model, CRUD API, Admin UI for create/edit/list, enforce min 3 photos and assignedSalespersons length <= 2 (validation layer).
- Acceptance: Admin can create property with required fields; server rejects property with <3 photos or >8 photos; limit assignment >2 rejected.

Day 6–7: Public feed & property detail + search
- Task: Public pages for feed (paginated), search (name/location/type), property detail page with enquiry CTA.
- Acceptance: Public search returns expected results; details page renders images & builder info, tests for search filtering.

Day 7–8: Joining-code generation & pending_invites
- Task: Director/Admin UI to create Admin joining code; Admin generate Salesperson joining code tied to property; persist pending_invites rows with statuses.
- Acceptance: Codes created, stored; codes expire in configurable TTL.

Day 8–9: Joining-code acceptance flows
- Task: Implement Other → Login as Admin/Salesperson flow: validate code, create RoleMapping, set invite accepted, redirect admin to org admin dashboard and sales to property CRM. Enforce max 2 salespersons in acceptance path.
- Acceptance: E2E test: invite created → candidate logs in with OTP → uses code → role mapping created → redirect correct UI → code status accepted.

Day 9: Enquiry → Lead creation and CRM
- Task: Enquiry form posts Lead with source=web_enquiry; CRM pages for Salespersons & Admin to list leads and change status. Email stub notification to assigned salesperson.
- Acceptance: Enquiry creates Lead; assigned salesperson sees lead; salesperson updates status and note changes persist.

Day 10: Tests, docs, staging deploy
- Task: Add unit tests for RLS enforcement and joining-code acceptance transaction; add integration smoke test for the main E2E flow; GitHub Actions CI to run tests and deploy to Vercel staging.
- Acceptance: CI passes tests; staging app accessible with seeded demo orgs.

Sprint deliverables
- Repo scaffold with initial code in feature/sprint-1 branch.
- Implemented endpoints & pages for key flows (onboarding, verification, property CRUD, feed, joining codes, lead creation, CRM listing).
- RLS policy migrations and tests.
- README and dev instructions.
- Staging deployment URL (Vercel with env stubs).

## 7. API & UI endpoints (top-level)
- POST /api/auth/otp/request — request OTP (stub/provider)
- POST /api/auth/otp/verify — verify OTP → issue session cookie / JWT with claims { userId, orgId? }
- GET /api/role-selection — returns options per user state
- POST /api/organizations — register builder (Director)
- GET /api/superadmin/organizations/pending — verification queue
- POST /api/superadmin/organizations/:id/verify
- POST /api/properties — create property (auth + org context)
- GET /api/properties — public feed (filters)
- GET /api/properties/:id — public detail
- POST /api/properties/:id/enquiry — create lead
- POST /api/pending-invites — create joining code (Admin/Director)
- POST /api/pending-invites/accept — accept code (OTP + code)
- GET /api/crm/leads — list leads for current user's assigned properties
- PATCH /api/crm/leads/:id — update lead status / add note

## 8. Testing strategy
- Unit tests for domain logic (joining-code acceptance, max-2-salesperson enforcement, property validation).
- Integration tests for:
  - Tenancy isolation (RLS): user in org A cannot read org B rows.
  - Joining flow: create invite → accept invite → redirect → roleMapping created.
  - Enquiry flow: public enquiry → lead created → sales sees lead.
- End-to-end smoke test for the full demo flow on staging.

## 9. Stubs & deferred items (explicit)
- Payments & Stripe: recorded plan rows only; actual billing, webhook handling, and enforcement deferred to Phase 2.
- File uploads: initial implementation uses signed URLs to a private S3 / local dev storage; production should use S3 + signed URLs and virus-scan if needed.
- OTP: use provider of choice; for dev use a deterministic stub that logs OTP to server console.
- Chat: Firestore planned for realtime; messages stored in chat_rooms/messages per spec. If you prefer alternative, confirm.

## 10. Non-functional & scaling notes
- RLS plus middleware minimize risk of cross-tenant data leaks.
- Keep all heavy media behind CDN and use lazy loading in frontend.
- For 100–500 tenants and thousands of users initial setup is fine with a managed Postgres (Neon / Supabase / RDS) and Vercel for frontend.
- Monitor usage counters per tenant to later trigger billing enforcement.

## 11. Next immediate steps (I will do after your confirmation)
- Confirm OTP provider and chat provider.
- Provide GitHub repo OWNER/REPO_NAME and permission to push branches.
- I’ll scaffold the repo (feature/sprint-1), push initial commits (Next.js + tRPC + Prisma + RLS script + basic pages), and open PRs for daily reviews.

---

If you want I can also:
- Convert each sprint task above into GitHub issues and create a sprint milestone once you provide OWNER/REPO_NAME.
- Scaffold the actual starter repo and push the first branch now.

Please confirm:
1) OTP provider choice: Firebase Auth (OTP) or custom (Twilio / other)?  
2) Chat: Firestore (as per spec) or prefer an alternate?  
3) Provide GitHub OWNER/REPO_NAME and confirm I may push feature/sprint-1 and create PRs.

Once you confirm these three items I will scaffold the repo and start implementing Sprint 1.
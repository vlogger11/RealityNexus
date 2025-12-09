# Realty Nexus — Sprint 1 (Alpha)

One-line goal
- Deliver end-to-end alpha: Director onboarding → Super Admin verification → property CRUD → public enquiries → joining-code flows → lead visible to assigned Salesperson.

Quickstart
1. Copy `.env.example` to `.env` and set DATABASE_URL and FIREBASE_... (for local dev stubs, STUB_OTP_ENABLED=true is fine).
2. Install deps:
   - npm install
3. Migrate & seed:
   - npx prisma generate
   - npx prisma migrate dev --name init
   - npm run db:seed
4. Start dev:
   - npm run dev

Notes
- OTP is stubbed for local development (STUB_OTP_ENABLED=true). Replace with real Firebase credentials for staging/production.
- Media/upload endpoints use a local stub (S3/Firebase Storage wiring deferred).
- Payments & Stripe integration are recorded but not enforced in Sprint 1.
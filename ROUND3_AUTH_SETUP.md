# BrandGuard AI Round 3 — Multi-user Workflow Setup

## Included
- Password-hashed administrator/reviewer accounts and signed 8-hour bearer sessions.
- Admin-only user creation and guideline mutations.
- Review assignment, reviewer-only assigned-review visibility, workflow status tracking, and backend permission checks for review access/decisions.
- Audit events for user creation, assignments, and workflow status changes.
- React login screen and Team Workflow page.

## Local demo
1. From `backend`, install dependencies and run the API as usual:
   `uvicorn app.main:app --reload`
2. First-run demo administrator credentials are `admin` / `ChangeMe123!`.
3. Sign in, open **Team Workflow**, create a reviewer, and assign an existing review.
4. Sign out and sign in as the reviewer to verify they only see assigned reviews.

## Before deployment
Set these backend environment variables in your hosting provider:
- `BRANDGUARD_SECRET_KEY`: a long random secret (do not use the source-code fallback).
- `BRANDGUARD_ADMIN_USERNAME`: desired first-run admin username.
- `BRANDGUARD_ADMIN_PASSWORD`: strong first-run admin password (10+ characters).
- `BRANDGUARD_DB_PATH`: persistent database path if supported by the host.

The default demo administrator is created only if its username is not already present. Changing the environment password does not reset an existing user's password. Create additional users from Team Workflow after signing in as an administrator.

## Verification
From `backend`, run `pytest -q`. The included suite currently passes (6 tests). The authentication/workflow endpoints are also tested manually for login, reviewer creation, assignment, reviewer access, and admin-only restrictions.

Note: this is a hackathon implementation, not a full production identity platform. Use HTTPS and a strong deployment secret. The frontend token is held in localStorage for demo simplicity.

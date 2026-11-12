# Invitation resends

## Verified external first-invitation trigger

Read-only inspection of the deployed `onWaitlistInvite` function in
`work-blueprint/us-central1` on 2026-11-11 confirmed:

- Firestore `waitlist/{docId}` update trigger. It exits if the previous status is
  already `invited`, or the new status is not `invited`.
- Uses Resend and Google Secret Manager's `RESEND_API_KEY`.
- Sender: `Blueprint <invite@myblueprint.work>`.
- Link: `https://www.myblueprint.work?invite=<encoded document ID>`.
- On Resend acceptance, writes `inviteEmailSentAt` and `inviteEmailId`.
- Provider rejection/exception is logged, not persisted. The function does not
  retry events. An invited status alone proves neither submission nor delivery.

The trigger was **not changed or deployed**. Source was inspected from its
deployed source archive, not inferred from the browser code.

## Explicit resend path

Both Admin Waitlist renderers mount the resend control beside invited entries.
The browser asks for confirmation with the destination address. It submits a
Firebase ID token, entry ID, expected email, explicit confirmation and a unique
request ID to `POST /api/invitation-resend`. Normal direct invitations remain
unchanged and do not automatically resend.

The server verifies the token (including revocation), reads the administrator's
current Firestore role, and reads the saved destination. A stale recipient, a
non-invited entry or a non-admin is rejected. It never writes waitlist/user
records or toggles invitation status.

Firestore transactions reserve:

- Five-minute recipient cooldown, shared across admins, entries for the same
  normalized address, and server instances. Includes the original trigger's
  acceptance timestamp when available.
- Three attempts per recipient per UTC day, including rejected/unknown attempts.
- Thirty attempts per administrator per UTC hour.
- A durable audit record and provider idempotency key. Replaying the same
  administrator/request ID returns its existing outcome and never sends again.

Collections: `invitation_resend_limits`, `invitation_resend_admin_limits`,
`invitation_resend_attempts`. They are server-only, covered by the existing
default-deny Firestore rules. No public waitlist fields hold resend audit data.

Provider outcomes: **accepted** (requires a Resend message ID), **rejected**,
**processing**, or **unknown**. Acceptance is never described as inbox delivery.
Timeouts/5xx are ambiguous and do not automatically retry or release quotas.
An audit write failure after a send is explicitly reported. “Check last resend”
uses authenticated `GET /api/invitation-resend?entryId=...` to read the persisted
latest attempt. Processing records older than a minute are reported as unknown.

## Runtime setup

The endpoint runs as a Vercel function; the Vite development adapter exposes the
same handler. It uses the existing `FIREBASE_SERVICE_ACCOUNT` credential, with
`Secret Manager Secret Accessor` on **only** the existing `RESEND_API_KEY` secret.
The secret is resolved at runtime, never copied into the repository or browser.
The Replit Resend connection is not used for the Vercel runtime.

No additional Firebase function deployment, status reset, provider webhook or
secret value is required. If configuration access fails, no provider request is
made and the UI reports that the email was not sent.

## Safe verification

Run `node --test tests/*invite*.test.mjs tests/invitation-resend.test.mjs`.
The tests use an isolated in-memory transaction store, injected provider
responses and synthetic browser objects. They do not access Firestore or send
external mail. A no-network component fixture is available at
`/tests/fixtures/admin-invite-resend.html` in development.

The real signed-in admin UI and an actual provider send require a separately
authorized manual check; automated checks intentionally do not send email.

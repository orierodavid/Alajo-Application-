# Alajo Application Architecture

## Status
MVP architecture baseline derived from `docs/rule-book.md` v1.0.

## Stack

- Next.js + TypeScript
- React
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)
- Payment provider integration through server-side services/webhooks
- Vercel for production deployment
- GitHub as the source repository

## High-Level Architecture

```text
Browser
  |
  v
Next.js UI
  |
  +--> Server Actions / Route Handlers
  |       |
  |       +--> Business Services
  |       |      +--> Membership Service
  |       |      +--> Contribution Service
  |       |      +--> Payout Service
  |       |      +--> Default/Recovery Service
  |       |      +--> Waiting List Service
  |       |      +--> Ledger Service
  |       |      +--> Notification Service
  |       |
  |       +--> Supabase
  |              +--> PostgreSQL
  |              +--> Auth
  |              +--> Storage (where required)
  |
  +--> Payment Provider
          |
          +--> Verified Webhooks --> Server

Supabase PostgreSQL
  +--> profiles
  +--> kyc_records
  +--> groups
  +--> group_slots
  +--> group_members
  +--> waiting_list
  +--> contribution_schedules
  +--> payments
  +--> payouts
  +--> ledger_transactions
  +--> reserve_transactions
  +--> notifications
  +--> disputes
  +--> audit_logs
```

## Architectural Principles

1. Financial state is server-controlled.
2. Client input is treated as untrusted.
3. Payment webhooks are idempotent.
4. Financial history is append-oriented; corrections use new ledger transactions.
5. Group membership and slot uniqueness are enforced at the database level.
6. RLS prevents users from reading or modifying another user's private records.
7. Sensitive financial operations use server-side authorization.
8. Configurable commercial rules are stored/configured centrally.
9. Every sensitive administrative action produces an audit record.
10. The UI consumes real application state rather than mock financial data once backend integration begins.

## Core Domains

### Identity & Access

Supabase Auth handles authentication. `profiles` stores application profile data. KYC is kept separate from general profile data and accessed only by authorized roles.

### Groups

`groups` defines the group configuration. `group_slots` defines payout positions. `group_members` links users to groups and slots.

### Contributions

`contribution_schedules` represents expected contribution obligations. `payments` represents payment-provider attempts/results. A verified successful payment produces the corresponding financial ledger event.

### Payouts

`payouts` represents scheduled and processed payouts. Payout state is server-controlled and reconciled with payment-provider results.

### Defaults & Recovery

Default logic evaluates overdue obligations, grace periods, waiting-list availability, reserve eligibility, and recovery obligations. A replacement gets a new membership record; the original member's ledger is never transferred into the replacement's history.

### Ledger

`ledger_transactions` is the authoritative application financial history. It records contributions, payouts, refunds, penalties, reserve coverage, recoveries, reversals, and approved adjustments.

### Audit

`audit_logs` records sensitive state changes and administrative operations.

## Database Rules

- Use UUID primary keys for application entities.
- Store monetary amounts as integer minor units where supported by the payment architecture, or use an exact numeric type with explicit currency handling.
- Never use floating-point arithmetic for money.
- Use foreign keys for domain relationships.
- Add unique constraints for provider transaction references and one active membership per group/slot.
- Add database constraints for enumerated states where appropriate.
- Use timestamps in UTC.
- Use database transactions for operations that update multiple financial records atomically.

## RLS Model

Users may read and modify only records they are authorized to access. Group membership does not grant unrestricted access to another member's private KYC or account information.

Administrative access is role-based. Service-role credentials are never exposed to the browser.

## Financial Integrity

A contribution is not considered paid because the client says it is paid. The payment provider webhook/server verification is authoritative.

A payout is not considered paid until its provider result has been verified.

If a payment is reversed after being recorded, the system records a reversal rather than deleting the original transaction.

## Default Handling

```text
Contribution due
  -> payment attempt
  -> failure/retry
  -> grace period
  -> overdue/default
  -> waiting list check
       -> replacement available: replacement + reconciliation
       -> no replacement: calculate shortfall
             -> approved protection available: reserve cover + recovery
             -> insufficient protection: FUNDING_EXCEPTION
```

## Deployment

GitHub `main` is the source branch for the MVP. Vercel deploys the Next.js application. Production environment variables include the public Supabase URL/key and server-only secrets such as payment-provider credentials and Supabase service-role credentials where required.

Secrets must never be committed to GitHub.

## Testing Requirements

Before production deployment, automated and integration tests must cover at minimum:

- Authentication and authorization
- Three-group limit
- Slot uniqueness
- Joining and slot reservation expiry
- Successful contribution
- Failed contribution and retry
- Duplicate webhook handling
- Default before payout
- Default after payout
- Waiting-list replacement
- No waiting-list scenario
- Reserve coverage and reserve limits
- Funding exception
- Payout approval/processing/failure
- Refund/reversal
- Ledger integrity
- RLS isolation
- Admin permissions

## Next Engineering Step

Build the Supabase/PostgreSQL schema from the Rule Book, then implement typed data access and business services before wiring the existing UI to live data.

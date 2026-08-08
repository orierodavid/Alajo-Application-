# ALAJO RULE BOOK
## Version 1.0 — Core Business & Operating Rules

**Product:** Alajo  
**Document:** Core Rule Book  
**Version:** 1.0  
**Status:** Foundation for MVP development

## 1. Purpose

Alajo is a digital rotational savings platform that allows eligible users to participate in structured savings groups. Each group has a fixed contribution amount, fixed membership/slots, defined cycle, payout order, contribution schedule, and defined handling for missed payments and defaults.

## 2. Core Principles

1. A member's contribution obligation is fixed when they join a group.
2. A member's payout position determines their scheduled payout period.
3. Receiving a payout does not end the member's obligation to contribute for the remainder of the cycle.
4. One member's default must not silently become another member's loss.
5. Every financial event must be recorded in the ledger.
6. Financial history must not be silently rewritten; corrections use new transactions.

## 3. Group Types

MVP supports 6-month and 10-month groups. A standard group has one payout position per cycle period.

## 4. Group Creation

Only authorized Alajo administrators can create groups. A group defines its name, cycle length, contribution amount, slots, start date, due date, payout schedule/order, and applicable rules.

A group must be activated before members can participate in its live cycle.

## 5. Group Statuses

`DRAFT`, `OPEN`, `FULL`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`, `FUNDING_EXCEPTION`.

## 6. User Eligibility

A user must have an Alajo account and satisfy applicable KYC, identity, payment/bank, agreement, and compliance requirements before membership becomes active.

## 7. Active Group Limit

A user may have a maximum of 3 active groups. Completed groups do not count toward this limit.

## 8. Group Slots

Each group has predefined payout positions. A position can belong to only one active member. Slot allocation is server-side and cannot be manipulated through the client.

## 9. Joining

Joining flow:

`Select group → eligibility check → active-group limit check → slot availability → terms acceptance → required initial payment → membership confirmation`.

A user is not fully active until all required joining conditions are satisfied.

## 10. Slot Reservations

If a slot is temporarily reserved while payment is completed, the reservation must expire after a configured period. Expired reservations return the slot to availability.

## 11. Contributions

Each member has a fixed contribution obligation. The system calculates the expected group pool from the configured contribution and group membership/slot structure.

## 12. Contribution Statuses

`PENDING`, `PROCESSING`, `PAID`, `FAILED`, `OVERDUE`, `WAIVED`, `REFUNDED`.

Every status transition is recorded.

## 13. Payment Processing

Payment state is determined from verified payment-provider results, not from frontend claims. Provider transaction references must be unique and webhook processing must be idempotent.

## 14. Duplicate Payments

The same provider transaction must never credit a member more than once. Duplicate webhook events are safely ignored.

## 15. Grace Period

A failed or late contribution enters a configurable grace period. During this period Alajo may retry payment and notify the member. The member is not classified as a permanent default until the configured grace period expires.

## 16. Missed Contribution

After the grace period, an unpaid contribution becomes `OVERDUE`/`DEFAULT` according to the configured state transition. The system records amount, due date, date missed, days overdue, payment attempts, member, group, and contribution period.

## 17. Default

A default does not erase the debt. The outstanding amount remains attached to the member's financial ledger.

## 18. Default Before Payout

A member who defaults before their payout may be suspended, placed into recovery, or replaced where permitted. Their historical ledger remains intact.

## 19. Default After Payout

A member who has received a payout remains obligated to make all subsequent contributions required to complete the cycle. Their remaining obligation must remain visible and recoverable.

## 20. Waiting List

When a group is full, eligible users may join an ordered waiting list. Replacement priority follows waiting-list order, subject to eligibility.

## 21. Replacement

Replacement flow:

`Default/eligible exit → replacement required → check waiting list → eligible member → offer/acceptance → financial reconciliation → membership activation`.

The replacement member receives a new membership record; they do not inherit the original member's historical ledger.

## 22. No Waiting-List Member

If a member defaults and no waiting-list member is available, Alajo must not simply reduce another member's scheduled payout. The system calculates the funding shortfall and checks the approved protection mechanism.

## 23. Protection Reserve

Alajo may maintain a legally and commercially approved protection reserve or other compliant mechanism for eligible shortfalls. The reserve is distinct from ordinary customer contribution balances and is not unlimited.

The reserve policy must define funding source, qualifying events, maximum coverage, approval requirements, recovery, and replenishment.

## 24. Reserve Coverage

For an eligible shortfall, the system may record reserve coverage and the related recovery obligation. Example: expected payout ₦500,000; group funding ₦450,000; shortfall ₦50,000; reserve cover ₦50,000; member recovery obligation ₦50,000.

## 25. Insufficient Reserve

If no replacement exists and the approved reserve cannot cover an eligible shortfall, the group enters `FUNDING_EXCEPTION`. Alajo must not create fictitious funds or silently take money from unrelated customer accounts. Authorized administration must resolve the exception under the approved operating framework.

## 26. No Cross-Customer Theft

Customer funds must not be silently diverted to cover another customer's default. Any reserve or cross-group mechanism must be explicitly defined, accounted for, and legally approved.

## 27. Payout Calculation

For a standard group, the scheduled payout is calculated from the group's configured contribution and applicable funded member/slot structure. The exact calculation must be stored before processing.

## 28. Payout Statuses

`SCHEDULED`, `ELIGIBILITY_REVIEW`, `APPROVED`, `PROCESSING`, `PAID`, `FAILED`, `HELD`, `CANCELLED`.

A payout is not `PAID` merely because its scheduled date has arrived.

## 29. Payout Eligibility

Before processing, the server checks member identity, group membership, payout position, group status, funding conditions, payment destination, compliance restrictions, and unresolved administrative issues.

## 30. Payout Failure

A failed payout remains `FAILED` and may enter retry or administrative review. A failed provider transaction is never recorded as a successful payout.

## 31. Post-Payout Monitoring

After payout, the dashboard must continue to display the member's remaining contribution obligation and next due contribution.

## 32. Penalties

Penalties, if used, must be disclosed, legally permissible, configurable, calculated consistently, recorded separately, and never silently alter principal contribution amounts.

## 33. Refunds

Refunds are only permitted under defined circumstances such as eligible cancellation, duplicate payment, failed activation, administrative correction, or approved dispute resolution. Refunds reference the original transaction.

## 34. Cancellation

A member cannot cancel in a way that erases an existing financial obligation. Rules depend on whether the cycle has started, payout has been received, replacement is available, and outstanding amounts exist.

## 35. Group Completion

A group becomes `COMPLETED` only after required contribution periods, scheduled payouts, funding exceptions, and financial reconciliation have been resolved.

## 36. Member Completion

A member is financially complete when required contributions, payout obligations, fees/penalties, and other outstanding obligations have been resolved.

## 37. Financial Ledger

Every financial event creates an immutable ledger record. Transaction types may include `CONTRIBUTION`, `PAYOUT`, `REFUND`, `PENALTY`, `ADJUSTMENT`, `RESERVE_COVER`, `RECOVERY`, `REVERSAL`, and `FEE`.

Each entry should include transaction ID, user ID, group ID, amount, currency, type, status, provider reference, related transaction, timestamp, description, and actor/system source.

## 38. Ledger Principle

The application must not rely solely on a mutable balance. Financial corrections create new transactions; original history remains available.

## 39. Audit Trail

Sensitive actions such as group creation, slot changes, KYC approval, payment verification, payout approval, defaults, replacements, reserve use, refunds, manual adjustments, and account suspension must generate audit records containing actor, action, target, state change, timestamp, and reason where applicable.

## 40. Administrator Permissions

MVP should support role-based administration such as `SUPER_ADMIN`, `ADMIN`, `FINANCE_ADMIN`, `KYC_ADMIN`, and `SUPPORT_ADMIN`. Financially sensitive operations require appropriate authorization.

## 41. Account Suspension

An account may be suspended for fraud, KYC, security, payment abuse, compliance, or other approved reasons. Suspension does not erase financial obligations.

## 42. Fraud Prevention

The system should detect duplicate payments, multiple-account abuse, payment reversals, unauthorized payout changes, slot manipulation, and suspicious activity. Suspicious events are flagged for review.

## 43. Notifications

The system should notify users about upcoming/failed/overdue contributions, defaults, approaching payouts, payout status, group membership events, replacement events, and relevant funding events.

Notifications do not themselves change financial state.

## 44. Disputes

Users may dispute contributions, payouts, refunds, penalties, membership, replacement, or account activity. Disputes use statuses such as `OPEN`, `UNDER_REVIEW`, `RESOLVED`, and `REJECTED`. A dispute does not automatically rewrite financial records.

## 45. Manual Adjustments

Manual financial adjustments are exceptional and require a reason, amount, related transaction, authorization, and audit record. Original transactions remain intact.

## 46. Security

The frontend is never trusted for financial decisions. Payment status, payout position, contribution state, and other sensitive values are determined server-side.

## 47. Source of Truth

Financial state: verified payment-provider records + database + ledger.  
Identity: authenticated account + verified KYC.  
Membership: group membership records.  
Payout status: server-side payout records.

## 48. Critical Default Flow

`Contribution due → payment attempt → failure → retry → grace period → default → check waiting list → replacement if available → otherwise calculate shortfall → protection mechanism → recovery`.

If protection is insufficient: `FUNDING_EXCEPTION → administrative resolution`.

## 49. Golden Rule

**One member's default must not silently become another member's loss.**

The system must always know who owes, how much they owe, why they owe it, which group is affected, whether replacement exists, whether protection applies, how much has been recovered, and what remains outstanding.

## 50. MVP Lifecycle

Primary lifecycle:

`REGISTER → KYC → JOIN GROUP → ASSIGN SLOT → CONTRIBUTE → TRACK CONTRIBUTIONS → PAYOUT → CONTINUE CONTRIBUTIONS → GROUP COMPLETION`.

Exception lifecycle:

`MISSED PAYMENT → GRACE PERIOD → DEFAULT → WAITING LIST → REPLACEMENT`.

No-waiting-list lifecycle:

`MISSED PAYMENT → DEFAULT → NO WAITING LIST → PROTECTION MECHANISM → RECOVERY`.

Insufficient-protection lifecycle:

`MISSED PAYMENT → DEFAULT → NO WAITING LIST → INSUFFICIENT PROTECTION → FUNDING_EXCEPTION → ADMINISTRATIVE RESOLUTION`.

## 51. Engineering Authority

This Rule Book is the business specification for MVP engineering. Database schema, Supabase RLS policies, server actions/API, payment processing, contribution engine, payout engine, default engine, waiting-list engine, reserve accounting, notifications, administration, and audit logs must implement these rules.

Grace periods, penalty formulas, reserve limits, and other commercially configurable values must be configuration-driven rather than scattered through application code.

## Regulatory Note

Before Alajo handles real customer funds in production, its custody/payment flow, reserve structure, terms, KYC/AML controls, and applicable Nigerian regulatory obligations must be reviewed and approved by qualified Nigerian legal/compliance professionals. The software must implement the approved operating model.

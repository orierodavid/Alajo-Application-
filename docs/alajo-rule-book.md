# Alajo Rule Book — Core Group Rules

## 1. Group structure
- A group has a fixed contribution amount, fixed cycle length, and fixed payout positions.
- Supported cycle lengths: 6 months and 10 months.
- A group must be full before its first payout cycle starts.
- A member may have a maximum of 3 active groups at once.
- A member cannot occupy two positions in the same group.
- Payout positions are immutable once the cycle starts.

## 2. Contributions
- Every active member owes the scheduled contribution for every cycle in which they remain an active member.
- A contribution is considered paid only after the payment provider confirms the transaction.
- A failed, reversed, or unconfirmed transaction does not satisfy the contribution obligation.
- The system records the exact due date, payment date, amount, status, and transaction reference.

## 3. Payouts
- A member becomes payout-eligible only when the group cycle's required funds are available and all platform payout checks pass.
- The payout engine must be idempotent: the same member/cycle cannot be paid twice.
- A payout must have a transaction record and an audit record.
- Once a payout is successfully completed, it cannot be silently reversed by the application.

## 4. Missed contribution and grace period
- A member who misses a scheduled contribution enters `grace` status.
- The member receives reminders during the grace period.
- The exact grace duration is configurable by Alajo operations and stored as a group rule; application code must not hard-code a single duration.
- If the member pays within grace, the missed contribution returns to `paid` and normal participation continues.

## 5. Default
- A member who remains unpaid after the configured grace period enters `defaulted` status for that obligation.
- A default does not automatically remove a member's previous completed payout history.
- The system creates a recovery obligation for the defaulted amount plus any applicable, published penalty.
- Penalties must be visible to the member before they become effective.

## 6. Waiting-list replacement
- If a waiting-list member is available and eligible, Alajo may replace a defaulted member according to the group's published replacement rules.
- A replacement does not retroactively erase the original member's debt.
- The replacement member must complete the required onboarding/KYC and any required catch-up contribution before receiving the rights attached to the position.
- The system must preserve both the original member and replacement member in the audit trail.

## 7. No waiting-list member available — critical protection rule
- If a default occurs and there is **no eligible waiting-list replacement**, Alajo must not simply divide the shortfall among members who already paid.
- Members who have already received their completed payouts remain entitled to the payouts already settled.
- The affected group's unpaid obligation is placed into a `shortfall` state and recovery begins against the defaulted member.
- A future replacement may be admitted when one becomes available, subject to the group's replacement rules.
- A remaining member's scheduled payout must not be marked as fully settled unless the required payout amount is actually funded.
- If Alajo operates a funded protection/reserve mechanism, the reserve may cover an eligible shortfall according to its published reserve policy; the reserve transaction must be recorded separately from member contributions.
- If no reserve is available, the affected payout is delayed rather than falsely marked complete. The application must show the exact funded amount, outstanding amount, recovery status, and next action.
- The application must never create money, fabricate a successful payment, or charge another member's contribution as an undisclosed loss.

## 8. Members who have already collected
- A member who received their payout remains responsible for all future scheduled contributions until their group obligation is completed or they are formally exited under the rules.
- Leaving after receiving a payout does not cancel outstanding contribution obligations.
- Default recovery may use the legally permitted recovery mechanisms disclosed in the group's terms.

## 9. Group completion
- A group is completed only after every required cycle has been processed and all member obligations/payouts have reached a terminal state.
- A group cannot be closed while there are unresolved funded/shortfall/recovery obligations unless an administrator explicitly closes it under a documented resolution procedure.

## 10. Financial integrity
- All money movements are represented by immutable transaction records.
- Business rules must be enforced server-side/database-side; the browser is never the source of truth.
- Every contribution, payout, reversal, default, replacement, recovery, and administrative adjustment must be auditable.
- Currency amounts are stored as integer minor units (kobo) to avoid floating-point money errors.

## 11. Status vocabulary
- `pending` — action/verification is not yet complete.
- `paid` — contribution successfully confirmed.
- `grace` — contribution overdue but still within grace.
- `defaulted` — contribution remains unpaid after grace.
- `replacement_pending` — replacement process is active.
- `shortfall` — required group funding is incomplete.
- `recovered` — outstanding obligation has been recovered/funded.
- `completed` — group obligation is fully settled.

## 12. Implementation principle
The database and server-side transaction logic enforce these rules. UI buttons only request an action; they do not grant permission to perform it.

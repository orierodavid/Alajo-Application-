# Alajo Contribution, Default & Payout Engine

## Core rule
A payout is only marked completed after the required contribution pool is actually funded. A member who has already received a payout is never silently charged for another member's default.

## Contribution lifecycle
`pending -> due -> grace -> paid | late -> defaulted`

- Each active member receives one contribution obligation per cycle period.
- The amount equals the group's configured contribution amount.
- A successful payment closes the obligation and records its provider reference.
- A missed deadline enters the configured grace period.
- Expiry of grace moves the obligation to `defaulted` and starts the replacement/recovery process.

## Replacement
1. Check the group's waiting list.
2. If an eligible replacement exists, offer the vacant slot under the group's replacement rules.
3. The replacement becomes responsible for future obligations from their activation point.
4. Any pre-activation shortfall remains explicitly tracked against the defaulting member/recovery case; it is not silently transferred to the replacement.

## No waiting-list case
If there is no eligible replacement:

1. Keep the affected payout unfunded/pending.
2. Create a shortfall/recovery record.
3. Continue collecting all unaffected members' normal contributions.
4. Do not mark the payout as successful merely because its scheduled date has arrived.
5. The defaulting member remains liable according to the group's signed rules.
6. Recovery funds can be allocated to the outstanding payout.
7. Once the full required pool is funded, the payout may be completed.
8. The system must preserve an audit trail of every recovery and allocation.

## Protection for members already paid
A completed payout is immutable as a completed payout. The system must not claw back or deduct from a previous recipient simply because a later member defaulted, unless a separate legally valid recovery process explicitly authorizes it.

## Payout calculation
For a group with `N` active payout slots and contribution `C`, the scheduled gross monthly pool is based on the contribution obligations actually due for that period. The payout engine must distinguish:

- expected pool
- collected pool
- shortfall
- recoveries
- payout amount
- payout status

A payout can only transition to `funded/processing` when its funding requirement is satisfied under the group's rules.

## Financial integrity
- Store money as integer kobo where possible.
- Never use floating-point arithmetic for monetary settlement.
- Every payment has an idempotency/provider reference.
- Every payout has an auditable status transition.
- Never create duplicate successful payment records for one provider transaction.
- Never mark a failed payment as successful from client-side state.
- All financial state transitions occur server-side/database-side.

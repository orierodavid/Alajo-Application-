# Admin payout schedule

Payout schedules are authoritative records created by an administrator. The user-facing application must not recalculate payout dates or expected amounts.

Creation is protected by the `admin_create_payout_schedule` database function and requires an authenticated user with the `admin` role.

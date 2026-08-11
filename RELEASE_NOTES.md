# Alajo release notes

## Contribution engine release

This release packages the current contribution-payment engine work on `main`, including scheduled contribution processing and the monthly contribution-cycle rules.

- Contribution processing is scheduled through Vercel Cron.
- Service-fee and delay-fee rules are handled by the contribution engine.
- Wallet auto-debit processing is included in the current backend.
- Monthly contribution deadlines use the 29th.

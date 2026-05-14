# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.9.x   | ✅        |
| < 0.9   | ❌        |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, report vulnerabilities by emailing **security@tomytate.com** with:

1. A description of the vulnerability
2. Steps to reproduce (if applicable)
3. Affected component (mobile, web, backend, shared)
4. Potential impact assessment

### Response Timeline

- **Acknowledgement:** within 48 hours
- **Initial assessment:** within 5 business days
- **Fix or mitigation:** based on severity

### Scope

The following are in scope:

- Supabase RLS bypass or tenant data leakage
- Authentication bypass (phone OTP flow)
- Local SQLite data exposure on shared devices
- Edge Function authorization failures
- Committed secrets or credentials in source
- PII exposure in logs or error messages

### Out of Scope

- Vulnerabilities in Expo/React Native/Supabase upstream dependencies (report to those projects)
- Denial of service against local development servers
- Social engineering attacks

## Security Practices

- **RLS on every table** — no exceptions. All queries scoped to `auth.uid()`.
- **No raw error logging** — production paths use `warnSafe()` to strip PII.
- **Committed secret scanning** — `bun run check:secrets` runs in CI and the foundation gate.
- **Forbidden patterns** — `console.log(...)` is blocked in production code by `check:patterns`.
- **Customer erasure** — `erase_customer_pii()` RPC blanks PII while preserving transaction history.
- **Immutable audit trail** — sales, voids, and stock takes are append-only with no UPDATE/DELETE.

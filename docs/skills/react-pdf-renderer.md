---
name: react-pdf-renderer
description: Use this skill when generating server-side PDF reports, receipt reprints, or BIR-ready export files from the Next.js dashboard.
version: 1.0.0
---

# @react-pdf/renderer — Server PDF Exports

## TD POS Usage

TD POS uses `@react-pdf/renderer` on the Next.js server for dashboard exports. PDF generation stays in Route Handlers or server-only modules; never import it into Client Components.

```tsx
import { Document, Page, Text, renderToBuffer } from '@react-pdf/renderer'

const buffer = await renderToBuffer(
  <Document>
    <Page>
      <Text>TD POS</Text>
    </Page>
  </Document>,
)
```

## Rules

- Use the Node API (`renderToBuffer`) for Route Handlers.
- Export PDFs through `runtime = 'nodejs'`; do not rely on Edge runtime compatibility.
- Reuse RLS-scoped server queries. PDF routes must not query with service-role credentials.
- Use BIR-ready language only. Do not write accredited receipt labels until the business and device are accredited.
- Keep PII out of PDFs unless the export explicitly requires it. Sales exports use IDs, receipt numbers, product names, totals, and payment method only.
- Set `Cache-Control: private, no-store` on generated PDFs.

## Sources

- Package: `@react-pdf/renderer@4.5.1` in `apps/web/package.json`
- Official docs: <https://react-pdf.org/>
- Node API docs: <https://react-pdf.org/node>
- Implementation: `apps/web/src/lib/pdf/build-sales-pdf.tsx`, `apps/web/src/app/api/exports/sales/pdf/route.ts`
- Last verified: 2026-05-09

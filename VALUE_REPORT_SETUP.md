# Value report setup

The dashboard can generate an Arabic Word value report from the same data used
by its PDF report.

## Vercel environment variables

Add this variable to the dashboard project:

```text
ANTHROPIC_API_KEY=your-key
```

Optional:

```text
ANTHROPIC_MODEL=claude-sonnet-5
```

Redeploy after changing environment variables.

The Word report still works if `ANTHROPIC_API_KEY` is not configured. In that
case it uses reviewed built-in Arabic narrative. All figures are always
calculated by `lib/value-report/computeMetrics.js`; the model is not allowed to
calculate or introduce numbers.

## Local checks

```bash
npm install
npm test
npm run build
node lib/value-report/sample.js /tmp/value-report-sample.docx
```

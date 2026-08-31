# Cloud Chefs lead conversions

The dashboard supports optional, client-scoped lead conversion data from Google
Sheets. Only Cloud Chefs currently has a `leadsSheet` configuration. If its Sheet
or service-account variables are absent or invalid, the dashboard keeps its
existing ad-platform behavior and omits all converted-lead UI.

## Expected columns

The configured Cloud Chefs tab must contain these exact headers in its first row:

- `Lead ID`
- `Converted (Y/N)`
- `Source`
- `Date`

`Date` is optional for overall metrics but required for exact date filtering,
period comparison, and the conversion-rate trend. Use one lead per row and a
real date value (for example, `2026-08-31`).
Accepted converted values include `Y`, `Yes`, `True`, `1`, `Converted`, and `Won`.
The `Source` value should name a platform (`Meta`, `TikTok`, `LinkedIn`, or
`Snapchat`) or the dashboard account/campaign name.

## Vercel environment variables

Set the target Sheet:

```text
CLOUD_CHEFS_LEADS_SPREADSHEET_ID=<id from the Google Sheets URL>
CLOUD_CHEFS_LEADS_SHEET_NAME=<exact visible tab name>
```

Set service-account authentication using the base64-encoded JSON variable from
the integration specification:

```text
GOOGLE_SERVICE_ACCOUNT_KEY_B64=<base64-encoded service-account JSON>
```

For compatibility, the dashboard also accepts the complete JSON in
`GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`, or these two variables:

```text
GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL=<service-account client_email>
GOOGLE_SHEETS_PRIVATE_KEY=<service-account private_key>
```

Share the spreadsheet with the service-account email as **Viewer**, then redeploy.
The integration requests only the `spreadsheets.readonly` OAuth scope.

## Using the Sheet in a report

1. Add or update lead rows in the configured Cloud Chefs tab. Keep the first-row
   headers unchanged.
2. Set `Converted (Y/N)` to `Y` only after a lead becomes a customer or reaches
   the conversion milestone you use internally.
3. In `Source`, use the platform or attribution name that matches the dashboard
   data, such as `Meta`, `TikTok`, `LinkedIn`, or `Snapchat`.
4. Open Cloud Chefs in the dashboard and select the report start and end dates.
   The dashboard reads Sheet rows whose `Date` falls inside that period.
5. Turn on **Compare with another period** and choose the second range. The
   comparison table shows both periods and their change, including converted
   leads, conversion rate, and cost per converted lead when available.

The Sheet itself is not uploaded in the dashboard. It is read automatically from
the configured spreadsheet ID after each dashboard refresh.

## Failure behavior

The Sheet is fetched only while building a dashboard response for a client whose
config contains `leadsSheet`. Authentication, permission, missing-tab, missing-
column, and API errors are logged server-side and return `null`. This leaves the
existing funnel, charts, cards, and tables unchanged.

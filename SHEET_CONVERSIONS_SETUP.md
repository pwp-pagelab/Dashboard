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

`Date` is optional for overall metrics but required for the conversion-rate trend.
Accepted converted values include `Y`, `Yes`, `True`, `1`, `Converted`, and `Won`.
The `Source` value should name a platform (`Meta`, `TikTok`, `LinkedIn`, or
`Snapchat`) or the dashboard account/campaign name.

## Vercel environment variables

Set the target Sheet:

```text
CLOUD_CHEFS_LEADS_SPREADSHEET_ID=<id from the Google Sheets URL>
CLOUD_CHEFS_LEADS_SHEET_NAME=<exact visible tab name>
```

Set service-account authentication using either one JSON variable:

```text
GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON=<complete service-account JSON>
```

or these two variables:

```text
GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL=<service-account client_email>
GOOGLE_SHEETS_PRIVATE_KEY=<service-account private_key>
```

Share the spreadsheet with the service-account email as **Viewer**, then redeploy.
The integration requests only the `spreadsheets.readonly` OAuth scope.

## Failure behavior

The Sheet is fetched only while building a dashboard response for a client whose
config contains `leadsSheet`. Authentication, permission, missing-tab, missing-
column, and API errors are logged server-side and return `null`. This leaves the
existing funnel, charts, cards, and tables unchanged.

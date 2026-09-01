# Cloud Chefs lead conversions

The dashboard supports optional, client-scoped lead conversion data from Google
Sheets. Only Cloud Chefs currently has a `leadsSheet` configuration. If its Sheet
or service-account variables are absent or invalid, the dashboard keeps its
existing ad-platform behavior and omits all converted-lead UI.

## Cloud Chefs workbook

The configured workbook is `Cloud Chefs Leads` and the dashboard reads these
existing advertising tabs directly:

- `Tiktok`: `TikTok Lead ID`, `Creation Time`, and
  `تم الفوز بالفرصة؟  نعم/ لا`
- `Snapchat`: `leadId`, `createTime`, and
  `هل تم الفوز بالفرصه؟ نعم/ لا`
- `Meta`: `Column 1`, `created_time`, and
  `تم الفوز بالفرصة؟ نعم/ لا`
- `Linkedin`: `lead_id`, `created_date`, and
  `تم الفوز بالفرصة؟ نعم/ لا`

The platform source is assigned from the tab name. The `website leads` and
`whatsapp` tabs are not included because they do not contain a reliable paid-ad
platform attribution key. Accepted converted values include `Y`, `Yes`, `True`,
`1`, `Converted`, `Won`, and `نعم`. `Maybe`, blank values, and `No` are not
counted as converted.

## Vercel environment variables

The Cloud Chefs spreadsheet ID is stored in its client configuration:

```text
1uC1W4hGPjk4N3K0zs6El5ygZTsarwUucEtSvQJg5Mz4
```

No separate Cloud Chefs spreadsheet ID or tab-name environment variable is
required. Only the service-account authentication below must be configured in
Vercel.

### Recommended when service-account keys are disabled: OAuth

The dashboard can use an offline Google OAuth grant from a user who can view the
Sheet. Set:

```text
GOOGLE_SHEETS_REFRESH_TOKEN=<refresh token authorized for spreadsheets.readonly>
```

It reuses `GOOGLE_ADS_CLIENT_ID` and `GOOGLE_ADS_CLIENT_SECRET` when they are
already configured. Dedicated credentials may instead be supplied as:

```text
GOOGLE_SHEETS_CLIENT_ID=<OAuth web client ID>
GOOGLE_SHEETS_CLIENT_SECRET=<OAuth web client secret>
```

The authorization must request offline access to:

```text
https://www.googleapis.com/auth/spreadsheets.readonly
```

### Alternative: service-account JSON

If the Google organization permits external service-account keys, set:

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

1. Add or update leads in the matching advertising-platform tab. Keep the
   first-row headers and tab names unchanged.
2. Set `Converted (Y/N)` to `Y` only after a lead becomes a customer or reaches
   the conversion milestone you use internally.
3. Open Cloud Chefs in the dashboard and select the report start and end dates.
   The dashboard reads Sheet rows whose `Date` falls inside that period.
4. Turn on **Compare with another period** and choose the second range. The
   comparison table shows both periods and their change, including converted
   leads, conversion rate, and cost per converted lead when available.

The Sheet itself is not uploaded in the dashboard. It is read automatically from
the configured spreadsheet ID after each dashboard refresh.

## Failure behavior

The Sheet is fetched only while building a dashboard response for a client whose
config contains `leadsSheet`. Authentication, permission, missing-tab, missing-
column, and API errors are logged server-side and return `null`. This leaves the
existing funnel, charts, cards, and tables unchanged.

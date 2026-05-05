# Client Share Links

The easiest way to create a client-safe link is from the dashboard:

1. Add one Vercel environment variable called `PUBLIC_SHARE_SECRET`.
2. Put any long private text inside it.
3. Redeploy.
4. Open the dashboard and choose one client.
5. Click `Create client link`.
6. Paste the copied link and send it to the client.

For a normal client report, leave Platform as `All platforms`. The shared link will include all active platforms for that client and the client can change only the date range.

The public page does not expose the full client list and does not allow switching clients or platforms.

Optional advanced setup: public reports can also be controlled by the `PUBLIC_REPORT_LINKS` environment variable.

Example:

```json
[
  {
    "id": "pwp-linkedin",
    "clientId": "pwp",
    "clientName": "PWP",
    "platform": "linkedin",
    "accountId": "512874914",
    "token": "replace-with-a-long-random-token"
  },
  {
    "id": "rimiya-tiktok",
    "clientId": "rimiya",
    "clientName": "Rimiya",
    "platform": "tiktok",
    "accountId": "7605605483197759504",
    "token": "replace-with-a-different-long-random-token"
  },
  {
    "id": "first-step-meta",
    "clientId": "first-step",
    "clientName": "First Step",
    "platform": "meta",
    "accountId": "1234567890",
    "accountName": "First Step",
    "businessKey": "FIRST_STEP",
    "token": "replace-with-a-different-long-random-token"
  },
  {
    "id": "calistra-snapchat",
    "clientId": "calistrafitness",
    "clientName": "Calistra",
    "platform": "snapchat",
    "accountId": "snap-ad-account-id",
    "accountName": "Calistra",
    "token": "replace-with-a-different-long-random-token"
  },
  {
    "id": "google-client",
    "clientId": "rimiya",
    "clientName": "Rimiya",
    "platform": "google",
    "accountId": "1234567890",
    "loginCustomerId": "0987654321",
    "token": "replace-with-a-different-long-random-token"
  }
]
```

Share either URL format:

```text
https://your-domain.com/share/replace-with-a-long-random-token?range=max
https://your-domain.com/?shareToken=replace-with-a-long-random-token&range=max
```

Supported platforms:

- `linkedin`: `accountId` is the sponsored account ID.
- `tiktok`: `accountId` is the advertiser ID.
- `meta`: `accountId` is the ad account ID. `businessKey` should match the client's configured Meta business key.
- `snapchat`: `accountId` is the Snapchat ad account ID.
- `google`: `accountId` is the Google Ads customer ID. `loginCustomerId` is optional.

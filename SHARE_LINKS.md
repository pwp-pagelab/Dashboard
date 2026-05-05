# Client Share Links

Public client reports are controlled by the `PUBLIC_REPORT_LINKS` environment variable.

Each item creates one private link locked to one ad account or advertiser account. The public page does not expose the full client list and does not allow switching clients or platforms.

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

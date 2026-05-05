# Meta System User Tokens

The dashboard already supports a dedicated SBSF Meta system user token.

In Vercel, add this environment variable:

```text
META_ACCESS_TOKEN_SBSF
```

Put the SBSF Meta system user access token as the value, then redeploy.

SBSF is configured to use the `SBSF` Meta business key in `data/clients.js`, and `lib/metaAccounts.js` reads `META_ACCESS_TOKEN_SBSF` first before falling back to the general Meta token.

For SBSF, the related optional business ID variable is:

```text
META_BUSINESS_ID_SBSF
```

If this variable is not set, the dashboard uses the existing SBSF business ID configured in the code.

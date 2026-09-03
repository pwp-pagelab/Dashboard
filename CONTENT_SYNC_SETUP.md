# Automatic published-content and ad reporting

The dashboard now reads posts and actual ad-level metrics on the server, alongside each selected client's existing reporting request. It does not create, publish, edit, or delete anything on the social networks. Browser-stored entries from the previous UI are left untouched but are no longer used or mixed into the live panels.

## Paid ads

The existing Meta, TikTok, LinkedIn, Snapchat and Google Ads account mappings and credentials are reused. No global account discovery is performed. Selected accounts and signed client-link account restrictions also apply to these detail requests.

- Meta: Insights at **ad** level, including ad ID/name, campaign, ad set, currency and form/message leads.
- TikTok: **AUCTION_AD** reports with ad IDs and ad names. The ad-level lead metric is instant forms only, labelled in the UI.
- LinkedIn: **CREATIVE** analytics joined to the account's creative names by creative ID.
- Snapchat: ad breakdown statistics joined to ad definitions by ad ID. Leads are N/A until a verified lead metric is configured; purchases are not treated as leads.
- Google: ad-group-ad statistics with actual ad names. Responsive-search headlines are displayed and explicitly labelled if Google has no ad name. Classified conversion-action categories determine leads.

Unknown ad names show “Ad name unavailable” plus the real ID. Account or campaign names are never substituted for the ad name. Spend remains in each account's currency. CPL tie-breaking is used only within a known matching currency. Google Sheet converted leads are not attributed to individual ads without an ad-level join key.

## Published posts: client-specific profile authorization

An ad account is different from a Facebook Page, Instagram profile, LinkedIn organization, or Snapchat Public Profile. Do not use an ad account ID in a social profile field. To avoid cross-client data leakage the app never guesses a profile by display name or reads an agency-wide feed.

In Vercel → dashboard project → Settings → Environment Variables, configure the following for the correct client. The suffix is the client ID in uppercase with hyphens replaced by underscores (Cloud Chefs = CLOUD_CHEFS). Set for Production and Preview when both should work, then redeploy.

| Channel | Per-client environment variables | Read authorization |
| --- | --- | --- |
| Facebook | FACEBOOK_PAGE_ID_CLOUD_CHEFS, META_PAGE_ACCESS_TOKEN_CLOUD_CHEFS | Page token with pages_read_engagement and access to that Page |
| Instagram | INSTAGRAM_ACCOUNT_ID_CLOUD_CHEFS, META_PAGE_ACCESS_TOKEN_CLOUD_CHEFS | Facebook Login route: Instagram professional account access, instagram_basic and pages_read_engagement |
| TikTok | TIKTOK_CONTENT_ACCESS_TOKEN_CLOUD_CHEFS | Client-profile Display API token with video.list; not the advertising API token |
| LinkedIn | LINKEDIN_ORGANIZATION_ID_CLOUD_CHEFS | Existing LINKEDIN_ACCESS_TOKEN must include r_organization_social and organization access |
| Snapchat | SNAPCHAT_PROFILE_ID_CLOUD_CHEFS, SNAPCHAT_CONTENT_ACCESS_TOKEN_CLOUD_CHEFS | Client-authorized Public Profile API token with snapchat-profile-api |

Profile IDs can alternatively be stored in the optional per-client socialAccounts object:

    socialAccounts: {
      facebookPageId: 'confirmed-page-id',
      instagramAccountId: 'confirmed-professional-profile-id',
      linkedinOrganizationId: 'confirmed-organization-id',
      snapchatProfileId: 'confirmed-public-profile-id'
    }

Store tokens only in Vercel; do not commit them or send them in chat. This implementation does not create consent grants or automatically refresh the new TikTok/Snapchat content tokens. Renew those tokens through their approved OAuth flow when they expire. Existing Google/Snapchat advertising token refresh remains in use for paid reporting.

## Coverage and behavior

- Facebook reads published Page posts, not unpublished/dark ad creatives.
- Instagram reads professional-account media. Available likes/comments are lifetime totals, not selected-period engagement.
- TikTok reads public profile videos and their lifetime counters.
- LinkedIn reads published organization feed posts; dark posts are excluded.
- Snapchat currently reads LIVE Spotlights only, not Stories/Saved Stories.
- Google Ads has no organic social feed.
- Posts are filtered by publication date using the selected start/end dates, inclusive, in UTC. Undated posts are not assigned a made-up reporting date.
- Unavailable post metrics remain unavailable, not zero.
- Detail reads are bounded to five pages (Google ads: 500 rows); hitting the bound is labelled partial. No claim of complete coverage is made when a detail call fails or is capped.
- There is no new global refresh task. Detail data runs in the same dashboard request lifecycle; authorization failures are isolated from summary reporting.
- Shared reports use the same server-side content data, not browser storage. Client-visible status messages do not expose environment-variable setup details.

## References

- [Meta Marketing API official collection](https://www.postman.com/meta/facebook-marketing-api/documentation/0zr4mes/facebook-marketing-api-mapi)
- [TikTok Display API: list videos](https://developers.tiktok.com/doc/tiktok-api-v2-video-list/)
- [LinkedIn creatives](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-creatives?view=li-lms-2025-11)
- [LinkedIn Posts API](https://learn.microsoft.com/en-au/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-03)
- [Snapchat ads](https://developers.snap.com/marketing-api/Ads-API/ads)
- [Snapchat profile assets](https://developers.snap.com/marketing-api/Public-Profile-API/ProfileAssetManagement)

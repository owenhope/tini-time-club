# Tini Time Club messaging and SEO audit

Audited 23 November 2026 against live public HTML and repository source.

## Positioning

Primary headline: **Find your next great Martini**.

Supporting promise: Explore nearby bars, compare reviews from the club, and save your favorite spots.

Lead with discovery, then explain how reviews, the Martini Index, saved places,
and the Passport help. Rating is a contribution to discovery, not the main
reason to download. Retain accurate feature names from CONTEXT.md. Avoid
unsubstantiated coverage, popularity, or “best” claims in acquisition copy.

The live US App Store listing (version 5.0.2, Apple lookup API) already opens
with “Find your next great martini.” Its name is “Tini Time Club, Martini Guide”.
The store title need not match the longer website title. Existing Instagram
campaign records are historical; do not rewrite them as if live ads changed.

## Live findings and source fixes

| Finding                           | Evidence                                                                                                 | Action                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mixed acquisition message         | Homepage H1 was only the brand name; intro led with remembering pours; Google Play draft led with rating | Discovery headline and supporting copy aligned across homepage, native welcome, and Play draft     |
| Admin login eligible for indexing | `/admin/login` returned 200 without robots noindex                                                       | Admin layout now emits noindex, nofollow                                                           |
| Social preview inheritance        | About/support/legal pages emitted homepage Twitter title; business also emitted homepage OG URL/title    | Allow Twitter title/description to inherit each page's OG metadata; business has its own OG fields |
| Duplicate host                    | HTTPS www and apex both returned 200                                                                     | Add permanent www-to-apex redirect preserving paths and query strings                              |
| Incomplete static sitemap         | Account deletion instructions absent                                                                     | Add canonical `/delete-account` URL                                                                |
| Old share artwork                 | Default previews used a logo-only PNG                                                                    | Replace with a versioned discovery creative and descriptive image alt text                         |

## Checks already healthy

- Homepage and six linked public pages returned HTTP 200 with server-rendered
  titles, descriptions, canonical URLs, and one visible H1 each.
- HTTP redirects permanently to HTTPS; HTTPS responses include HSTS.
- Robots allows crawling and advertises the sitemap; public CSS/JS is crawlable.
- Legacy `/privacy-policy` and `/tini-time-club` URLs resolve to their intended
  canonical public pages.
- Unknown route returns a real HTTP 404 and noindex, rather than a soft 404.
- Homepage, publisher, support, and legal structured data are present in source.
- Hero uses Next Image with responsive sizes and priority loading. Fonts are
  hosted locally with swap display.
- Public place/review pages have individual canonical and social metadata.
  Their data is served through the existing public-content boundary.

## Remaining measurement and content work

1. Verify the domain property in Google Search Console, submit the sitemap,
   inspect the homepage after deployment, and review indexing exclusions and
   actual search queries. No Search Console account data was available in this
   audit; crawlability is not proof that Google indexed a page.
2. Measure mobile Core Web Vitals with PageSpeed Insights / CrUX and Search
   Console. The public PageSpeed API returned a daily quota error. No field-performance score is claimed here. Optimize the measured
   bottleneck before adding speculative performance changes.
3. Public venue/review URLs are not in the static sitemap. Consider an approved,
   paginated discovery index and dynamic sitemap once public visibility,
   removal, and freshness contracts are defined. Do not enumerate private
   member content or use a service-role shortcut for SEO.
4. Publish useful, original Martini guides and city discovery pages only where
   there is enough verified content. Link these from the homepage and relevant
   venue pages. Avoid thin city pages and invented “best bar” recommendations.
5. Check Google rich-result eligibility without inventing ratings, prices, or
   availability. FAQ markup is not a guarantee of a Google FAQ rich result.
6. Upload the final Apple header/search assets to the intended app version and
   preview both placements in App Store Connect. Store review/release governs
   when users see them. Google Play draft copy must also be applied in Console.
7. After website deployment, inspect the publicly fetched OG image and refresh
   Facebook's Sharing Debugger. WhatsApp and iMessage may cache existing links;
   a changed image URL helps but cannot force all clients to refresh immediately.

## Sources

- [Apple creative asset dimensions and safe areas](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications)
- [Apple asset placement workflow](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets)
- [Google canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google noindex rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Live website](https://tinitimeclub.com/)
- [Live App Store listing](https://apps.apple.com/us/app/tini-time-club-martini-guide/id6741620393)

## Delivery status

Final artwork uses original seeded app screenshots, with exact PNG dimensions
and headline bounds asserted inside Apple's safe areas. Social artwork is
1200×630; Google Play artwork is 1024×500 and uses an Android screenshot.

Apple header and search assets were submitted for review on 23 November 2026
(submission 95dd2c6a-bc52-456b-af29-b56e85df427d). Placement selection is blocked
until approval: Browse Asset Library only offers approved assets. After approval,
select the new header and search files on version 5.0.2 and save.

Google Play's short description and feature graphic were submitted together.
Console shows Changes in review, with automated checks still running. Managed
publishing is off, so approved changes publish automatically. Existing store
full descriptions already lead with discovery and were preserved.

Website source and social image are ready for production deployment. Native
welcome copy is included in source for the next app update; no new binary or
OTA was required for these store listing changes.

Validation: root and admin TypeScript checks passed; all 141 root test suites
(959 tests) and 63 admin tests passed. Production admin build passed. Admin
lint passed; root lint reports two pre-existing warnings in home.tsx and
CommentsSlider.tsx. The aggregate verify command stopped at an unrelated
formatting issue in ignored .claude/settings.local.json; remaining lint and
tests were run separately. Homepage was visually checked in Chrome;
page-specific Twitter fields, admin noindex, and the www redirect were verified
in local HTML and HTTP responses.

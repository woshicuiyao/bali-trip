# Bali trip: GitHub Pages migration

The full app under `app/` is deployed through GitHub Actions. The root `index.html` and `health.json` are retained legacy access-test files and are not included in the production build.

## Structure

- `app/`: mobile React UI, Google map, itinerary, bookings, checklist, sharing.
- `supabase/functions/bali-trip/`: invitation-authenticated API; no Sites runtime dependencies.
- `supabase/migrations/`: private data table and access restrictions.
- `tests/`: authorization, version conflicts, persistence, flight time zones and share URL checks.
- `.github/workflows/deploy.yml`: build and publish after API health succeeds.

## Release sequence

1. Connect the Supabase project and grant the GitHub connection access to this repository.
2. Apply the database migration. Import the latest snapshot from the old service privately, preserving its version, update timestamp and all collections. Do not use an older seed if online data has changed.
3. Import SHA-256 digests of the existing editing/viewing invitations into `journey_access`, plus the digest of the derived read-only invitation. Only the edge function can read this table. Never put invitation tokens in GitHub variables, files, build arguments or public assets. The edge function allows the production origin `https://woshicuiyao.github.io`.
4. Deploy the `bali-trip` edge function with its `deno.json` import map and `verify_jwt = false`. The function verifies the SHA-256 digest of the long random invitation on every trip/share request; this flag only disables Supabase's unrelated JWT gateway check. Database access remains unavailable to anonymous or normal authenticated clients.
5. Verify `/health`, an authenticated read, a reversible edit, a read from a separate client and a stale-version conflict against the deployed database. Re-export the old source just before cutover if anyone still edits it.
6. Set the public repository variable `VITE_TRIP_API_URL` to `https://<project-ref>.supabase.co/functions/v1/bali-trip`. The URL is public configuration; it is not a credential.
7. Switch GitHub Pages source to GitHub Actions. Run **Publish Bali trip** and wait for a successful deployment. Future pushes updating `app/` rebuild the same share address automatically.
8. Test the new full invitation in the user's WeChat network, including API reads and saves. The earlier static page test does not prove access to the new data service.

The `.private/` directory holds a local source snapshot and original invitation credentials, is ignored by Git, and must never be uploaded or served. The app bundle contains no itinerary snapshot, booking documents or invitation credentials.

## Local verification

Use Node 24, run `npm ci`, `npm test` and `npm run build`. Set `VITE_TRIP_API_URL` for an actual API or a local preview server before opening an invitation. Local preview modifications must not touch the production dataset.

The GitHub Pages subpath `/bali-trip/` is used for scripts, styles, images, favicon and newly generated invitations. Google Maps loads separately and does not block the itinerary UI.

## Data synchronization

The API uses atomic version-checked updates; two clients cannot silently overwrite each other. Visible clients refresh every 15 seconds. Failed writes are shown as errors. No local-only write fallback is reported as a successful shared save.

After cutover, changes in the new site update its independent database. Changes made in the old site will not automatically copy across databases. Keep future edits on the new invite link and update code through this repository.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Supabase function configuration](https://supabase.com/docs/guides/functions/function-configuration), [Supabase server secrets](https://supabase.com/docs/guides/functions/secrets).

## Deployment status (2026-09-25)

The full application was published successfully in [run 36149220744](https://github.com/woshicuiyao/bali-trip/actions/runs/36149220744). The fresh cloud build and all 11 automated tests passed. GitHub Pages uses GitHub Actions, and `VITE_TRIP_API_URL` is configured as a public repository variable.

Supabase project `wqamtsynorsmozcrmhjj` in Singapore is active, with 162 imported records and edge function `bali-trip` version 1. Anonymous and ordinary authenticated roles cannot read the tables. The old source was rechecked before cutover and still matched the imported version 1 snapshot.

The cloud health check passed in [run 36148377180](https://github.com/woshicuiyao/bali-trip/actions/runs/36148377180). Chrome loaded the full live itinerary and generated a viewing invitation. The user confirmed the full page opens in WeChat, but Google Maps does not display there. A completed shared save in WeChat remains to be confirmed.

The map update defaults to the itinerary map in WeChat, keeps a Google display switch and Google route/navigation links, and bundles a small Natural Earth coastline with the page. OpenStreetMap supplies optional detailed tiles; no tiles are bulk downloaded or cached outside normal browser caching. The coastline, markers and itinerary-order connections remain when those tiles fail. Mobile layout and per-day location changes were checked with every external tile request deliberately failing in a local preview. This does not prove Google is accessible in WeChat.

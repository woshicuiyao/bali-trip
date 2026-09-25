# 巴厘岛 · 国庆同行

Mobile travel planner hosted on [GitHub Pages](https://woshicuiyao.github.io/bali-trip/), with invitation-protected shared data in Supabase. Open a complete invitation to view the itinerary; the bare site address deliberately does not expose travel data.

- Daily itinerary, accommodation, flights and checklists.
- Shared editing with version checks and refresh every 15 seconds while visible.
- Separate viewing and editing invitations.
- Google Maps routes plus an interactive itinerary map for WeChat. The latter includes a bundled public-domain island outline, so itinerary locations remain visible when external map tiles fail. Dashed connections show itinerary order, not driving routes.

## Development

Use Node 24. Run `npm ci`, `npm test`, and `npm run build`. Public runtime configuration is documented in `app/.env.example`. Never commit travel snapshots, original booking files, invitations or server keys.

## Publishing

Push application changes to `main`; the **Publish Bali trip** workflow checks the data service, runs tests, builds and deploys `app/dist`. GitHub Pages uses **GitHub Actions** as its source. The root `index.html` is the retained legacy connectivity test, not the deployed app.

The live data lives in Supabase. Source changes here rebuild the page; changes made by friends in the page save to the shared database. The old `chatgpt.site` service is a separate copy and must not be used for new shared edits.

See [MIGRATION.md](MIGRATION.md) for deployment and data-access details.

Map sources: [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/copyright), and [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/). Natural Earth's 1:10m country dataset was filtered to the Bali and Nusa Penida island polygons; these low-detail outlines are for trip overview only.

### Detailed mobile map

The default map uses MapLibre and a self-hosted Protomaps/OpenStreetMap regional extract (2026-09-25, zooms 0–14; client can overzoom to 18). The PMTiles archive, fonts, sprites and worker are all served by the same GitHub Pages origin. It does not depend on Google or public OSM tile servers. Labels use English/local street names; itinerary pins use Chinese names. Regional bounds include Bali, Lembongan and Nusa Penida.

`python3 scripts/prepare-map.py` downloads the fixed `bali-basemap-20260925-v1` release and verifies the map checksum. The first publishing workflow creates that release from the official Protomaps source. The generated assets are ignored by Git, but included in the Pages artifact. The public map release contains no itinerary, bookings or invitations. It includes attribution, font and sprite licenses. GitHub Pages HTTP Range responses are required and were verified.

The whole-trip map shows a distribution of locations, rather than joining an unordered list into a fake driving route. Daily dashed connections indicate visit order only and stop at island boundaries. Regional attraction markers are not guaranteed entrance/meeting points. Google remains an optional map/navigation provider and requires Google connectivity on the visitor's network.

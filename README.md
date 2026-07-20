# IDriveTube

Read-only private video streaming from IDrive Cloud Drive. The application
uses Next.js, shadcn/ui, PostgreSQL, BullMQ, FFmpeg, Nginx, and Docker Compose.
The watch experience uses the editable Limeplay shadcn block with Shaka Player.

The browser never uploads or accesses IDrive directly. A backend worker lists
video files through the unofficial [`idrive-sdk`](https://www.npmjs.com/package/idrive-sdk),
downloads a selected file into a temporary cache, packages it as HLS, and
deletes the downloaded original. Nginx serves the resulting HLS only after
Next.js authorizes the viewer.

## Start

The host must already have a working [`idrive-cli`](https://www.npmjs.com/package/idrive-cli)
login. Its configuration and official transfer engine are mounted into the
worker container; the application itself depends directly on `idrive-sdk`.
The worker copies the mounted profile into a private root-owned file at startup
so the SDK's profile ownership checks remain enforced inside the container.
The transfer engine is mounted read-only and temporary operation workspaces stay
inside the container rather than modifying the host's CLI data directory.
Before consuming jobs, the worker verifies both the staged profile and transfer
engine integrity. Container shutdown cancels active IDrive and FFmpeg processes
before BullMQ closes, with a 30-second Compose grace period for cleanup.

```bash
cp .env.example .env
# Replace every password and secret in .env.
docker compose up --build -d
docker compose ps
```

Open <http://localhost:3000> and sign in with `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `.env`.

The included Nginx container listens on `127.0.0.1:3000` by default. Point a
reverse proxy on the same host at that address, or adapt the port binding and
Docker networks for your own domain/proxy setup. No external proxy network or
domain-specific configuration is required by the public Compose file.

`IDRIVE_VIDEO_FOLDER` defaults to `/personal`. Change it to point at another
Cloud Drive folder. Keep `COOKIE_SECURE=false` for local HTTP and set it to
`true` when the public deployment is behind HTTPS.

`HLS_CACHE_MAX_BYTES` defaults to 50 GiB. Least-recently-opened streams are
evicted automatically when the cache exceeds this budget.

## Streaming flow

1. The worker uses the typed IDrive client API to list the configured folder.
2. Supported MP4, M4V, MOV, MKV, and WebM files appear in the library.
3. Opening an uncached video queues private background preparation.
4. The worker downloads the complete original from IDrive.
5. FFmpeg stream-copies browser-compatible H.264/AAC video through 1080p when
   keyframes are at most 12 seconds apart. Other inputs are converted to
   H.264/AAC without upscaling; only sources above the landscape 1920x1080 or
   portrait 1080x1920 boundary are downscaled.
6. The temporary downloaded original is deleted.
7. Nginx serves HLS after an authorization subrequest to Next.js.

The UI supports light, dark, and system themes. Next.js Cache Components keep
the navigation shell and Shadcn loading skeletons instantly available while
session, database, and filesystem work streams through local Suspense
boundaries.

Because IDrive has no streaming/range API, first playback requires a complete
download and HLS packaging. Compatible files avoid quality loss and expensive
video encoding. Later playback uses the local HLS cache.

## Operations

```bash
npm run check
docker compose config
docker compose logs -f worker
docker compose down
```

Persistent Docker volumes retain the database, Redis queue, HLS cache, and
thumbnails. `docker compose down -v` destroys that data and should only be used
for an intentional reset.

## Security

- Never commit `.env`, IDrive CLI configuration, database volumes, or HLS cache
  files. They are excluded from this repository and Docker build context.
- Generate unique values for every password and `SESSION_SECRET`; the example
  values are placeholders only.
- Keep the application behind HTTPS and set `COOKIE_SECURE=true` before making
  it internet-accessible.

## Third-party code

The editable Limeplay player block is included under its MIT license. See
`THIRD_PARTY_NOTICES.md` for attribution.

## License

IDriveTube is available under the MIT License. See `LICENSE`.

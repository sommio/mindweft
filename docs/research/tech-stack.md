# Tech Stack Research — Self-Hosted Private AI Companion

**Date:** 2026-07-10
**Method:** Primary sources only — official docs, GitHub repos, npm registry, first-party benchmarks. Every quantitative claim (stars/downloads/versions/last-push) was read live on 2026-07-10 via the GitHub API, npm registry, and official docs sites.

---

## Headline verdict

**TypeScript wins, and there is no blocker.** Once embedding moved from a local `sentence-transformers` model to an **API**, Python's single real advantage (native local-ML ecosystem) disappears — and because the frontend **must** be JS/TS regardless (PWA + web push), choosing anything other than TS for the backend just creates a polyglot split stack with two build systems inside one required monorepo. TS now matches Python on the risk areas (Chinese BM25 via `@node-rs/jieba` is a maintained, prebuilt, jieba-rs-lineage binding — 241K weekly downloads vs nodejieba's 17K — so no Python sidecar is justified) and beats it on the orchestration areas (monorepo, PWA, provider-agnostic AI gateway).

**The stack, one line per layer:** TypeScript 7 · pnpm workspaces + Turborepo · **Next.js 16** (App Router, route handlers, `output: 'standalone'`) · **Vercel AI SDK 7** (`@ai-sdk/anthropic` + `@ai-sdk/openai` with custom `baseURL` for BYOK + self-hosted) · **better-sqlite3 + sqlite-vec + Drizzle ORM** (in-DB vectors, brute-force KNN) · **@node-rs/jieba** for Chinese tokenization + in-app BM25 + RRF fusion · **node-cron** in-process · **Serwist** PWA + **web-push** · **Vitest + Playwright** · single **docker compose** service.

**The one follow-up risk to track:** sqlite-vec is brute-force KNN (no ANN) — fine at B-tier (handful of users, ≤~100K memory vectors), but the migration path if scale grows is **pgvector (HNSW)**, not Qdrant/Chroma. Also: libsql/Turso remote-replica is **not** officially confirmed sqlite-vec-compatible, so use `better-sqlite3` local file now and treat Turso as a separate later evaluation.

---

## Q1. (DEEP) Is TS/JS actually the best fit for THIS app vs Python vs Go?

### Recommendation
**TypeScript, full-stack. No blocker. No Python/Go sidecar.**

### Reason
The dev's hypothesis ("TS ecosystem is best for this kind of app") holds once the embedding model moves to an API. Test it against each need the app actually has:

| Need | TS | Python | Go |
|---|---|---|---|
| SSE streaming chat | Next.js route handlers + AI SDK `streamText`; Hono `streamSSE` | FastAPI `StreamingResponse` | `net/http` SSE (manual) |
| Provider-agnostic AI gateway (BYOK, Base-URL, self-hosted **or** external) | AI SDK `createAnthropic({ baseURL })` / `createOpenAI({ baseURL })` — confirmed | LiteLLM / langchain | langchaingo (thinner) |
| Anthropic prompt caching (`cache_control` ephemeral) + streaming | AI SDK `providerOptions.anthropic.cacheControl` + `@anthropic-ai/sdk` (24M/wk) | anthropic Python SDK | anthropic Go SDK (thinner) |
| API-based vector search | sqlite-vec Node binding (confirmed for better-sqlite3/node:sqlite/bun/deno) | sqlite-vec Python binding | sqlite-vec Go binding |
| Chinese BM25 tokenization | `@node-rs/jieba` (prebuilt, jieba-rs lineage, faster than nodejieba) | `jieba` (canonical but stale — last commit 2024-08-21) | gojieba/wukong (ports, less mature) |
| cron | `node-cron` (6.8M/wk) | APScheduler / croniter | robfig/cron |
| PWA (installable + service worker) | Serwist / vite-plugin-pwa — **TS-native** | forces a JS/TS frontend anyway | forces a JS/TS frontend anyway |
| Web push (VAPID) | `web-push` (4.5M/wk, Node) | possible but less standard | thinner libs |
| Monorepo (required) | pnpm + Turborepo — best-in-class | weaker (poetry/hatch workspaces) | go workspaces (different model) |
| docker compose, no serverless | ✓ | ✓ | ✓ |

The decisive points:

1. **The PWA requirement forces a TS frontend no matter what.** A Python or Go backend means a polyglot monorepo (Python/Go API + TS PWA) — two languages, two package managers, two CI toolchains, a cross-language type boundary. The task *requires* a monorepo and values engineering rigor; a single-language full-stack TS monorepo removes a whole class of wiring work and lets the dev spend that attention on the actual architecture (memory graph, forgetting curve, hybrid retrieval).
2. **API embedding erases Python's local-ML advantage.** The original tutorial used Python specifically because `sentence-transformers` + `jieba` ran locally. With embeddings now coming from an API, there is no local model inference in the hot path. The remaining "ML-ish" work is BM25 + a forgetting curve + a memory graph — all plain algorithms, all fine in TS.
3. **Chinese tokenization — the real risk area — is genuinely solved in TS.** `@node-rs/jieba` (2.0.1, 241K weekly downloads, repo `napi-rs/node-rs` pushed 2026-07-09) is a napi-rs binding to **jieba-rs** (a Rust port of the same jieba project), ships **prebuilt binaries** ("no `node-gyp` and c++ toolchain"), and benchmarks **faster than `nodejieba`** (8,246 vs 6,392 ops/sec on a 1,184-word cut). Meanwhile the canonical Python `fxsjy/jieba` repo hasn't been pushed since **2024-08-21** (~2 years stale). The gap people assume exists is the reverse of reality in 2026.
4. **Provider-agnostic gateway is a first-class TS story.** The Vercel AI SDK (`ai`, 15.9M/wk, repo `vercel/ai` pushed 2026-07-09) standardizes Anthropic + OpenAI + OpenAI-compatible providers and exposes `baseURL` on both `createAnthropic` and `createOpenAI` — so "hit a self-hosted local server OR an external API" is a one-line config, and Anthropic `cache_control` breakpoints are exposed via `providerOptions`.

Where Python/Go could still win — and why they don't here:
- **Python** would win if you needed local model inference (`sentence-transformers`, `transformers`, `spaCy`). That is explicitly out of scope (API embedding). Python would also be attractive if the codebase were *already* Python (it isn't — this is greenfield).
- **Go** would win for a high-throughput backend shipped as a single binary. This is a B-tier app for a handful of users; its perf ceiling is irrelevant, and Go's AI/tokenizer ecosystem (langchaingo, gojieba) is thinner than TS's. Go also doesn't help the PWA frontend, so it still creates a polyglot split.

### Alternatives
- **Python (FastAPI + Vite PWA frontend):** only if local model inference is later added back. Otherwise strictly more moving parts for this app.
- **Go (net/http + Vite PWA frontend):** only if the deployment target demanded a single static binary with extreme throughput. Not this app.

### Sources
- npm registry (read 2026-07-10): `typescript` 7.0.2 (216M/wk), `ai` 7.0.19 (15.9M/wk), `@anthropic-ai/sdk` 0.110.0 (24.4M/wk), `@node-rs/jieba` 2.0.1 (241K/wk), `nodejieba` 3.5.8 (17K/wk), `node-cron` 4.6.0 (6.8M/wk)
- GitHub API (read 2026-07-10): `vercel/ai` (25,464★, pushed 2026-07-10), `anthropics/anthropic-sdk-typescript` (2,036★, pushed 2026-07-10), `napi-rs/node-rs` (1,461★, pushed 2026-07-09), `yanyiwu/nodejieba` (3,230★, pushed 2026-06-28), `fxsjy/jieba` (35,055★, pushed **2024-08-21** — stale)
- AI SDK provider docs: https://ai-sdk.dev/v7/providers/ai-sdk-providers/anthropic , https://ai-sdk.dev/v7/providers/ai-sdk-providers/openai , https://ai-sdk.dev/docs/foundations/overview
- `@node-rs/jieba` README: https://github.com/napi-rs/node-rs/blob/main/packages/jieba/README.md (prebuilt-binary + benchmark claims)

---

## Q2. (SOLID) Full-stack framework — Next.js vs Hono vs Fastify vs NestJS

### Recommendation
**Next.js 16 (App Router + route handlers, `output: 'standalone'`)** — one full-stack process, one container.

### Reason
The app's shape is "PWA frontend + SSE chat backend + in-process memory engine + cron, deployed as one container." Next.js is the only candidate that gives you all of that in a single deployable without wiring a frontend build into a backend-only framework:

- **SSE streaming:** route handlers return a `Response` wrapping a `ReadableStream`; the official docs show exactly the AI SDK `streamText` → `StreamingTextResponse` pattern, and a raw `ReadableStream` pattern for hand-rolled SSE. (Next.js 16.2.10 docs, "Streaming" section of the route handler reference.)
- **Self-hosting as one minimal container:** `output: 'standalone'` emits a `.next/standalone` folder + minimal `server.js` with only the needed `node_modules`; Vercel publishes an official multi-stage `Dockerfile` (slim base, non-root user, BuildKit cache mounts, pnpm-aware). `next start` / `node server.js` is a **long-running Node server** — none of the serverless timeout constraints apply, so cron + long memory jobs are fine.
- **PWA:** handled by Serwist (see Q3) which wraps `next.config` — no separate build pipeline.
- **Monorepo caveat (important):** in a pnpm monorepo, set `outputFileTracingRoot` to the monorepo root so Next traces files outside the app package (e.g. shared `packages/*`); use `outputFileTracingIncludes` for native assets like `better-sqlite3`/`sqlite-vec` binaries if tracing misses them.

Why not the others:
- **Hono (31K★, 47M/wk, pushed 2026-07-10)** has the best SSE ergonomics (`streamSSE`, `streamText`, abort handling) and runs on `hono/node-server` — but it is a **backend framework**. You'd still build a separate Vite/React/Svelte PWA and have Hono serve its static output. Two build pipelines in one image. Pick this only if you actively want a FE/BE split.
- **Fastify (36.8K★, 9M/wk, pushed 2026-07-09)** is fast and clean but, like Hono, backend-only; SSE via `reply.raw`. Same split-stack cost.
- **NestJS (76.2K★, 11.4M/wk, pushed 2026-07-10)** is an opinionated modular monolith with DI/modules — strong rigor, but heavyweight for a B-tier single-compose app, and also backend-only (needs a separate frontend). Overkill here.

### Alternatives
- **Hono + Vite SPA** if you want a clean FE/BE split and are willing to wire two builds into one image. Best SSE API of the lot.
- **NestJS** if you want strict modular-monolith structure and DI and don't mind the weight + a separate frontend.

### Sources
- Next.js route handlers (streaming + AI SDK): https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js `output: 'standalone'`: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Official Next.js Docker example (standalone, multi-stage, pnpm): https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile , https://github.com/vercel/next.js/blob/canary/examples/with-docker/README.md
- Next.js self-hosting guide: https://nextjs.org/docs/app/guides/self-hosting
- Hono streaming helpers: https://hono.dev/docs/helpers/streaming
- GitHub API (read 2026-07-10): `vercel/next.js` (140,561★), `honojs/hono` (31,302★), `fastify/fastify` (36,764★), `nestjs/nest` (76,201★)

---

## Q3. (CONCISE) Frontend + PWA

### Recommendation
**Next.js (React) for the frontend, Serwist (`@serwist/next`) for the PWA service worker, `web-push` for VAPID notifications.** (Follows from Q2 — the frontend is Next.js.)

### Reason
- Serwist is the maintained successor to `next-pwa` (Workbox-based): `withSerwist` wraps `next.config`, emits a service worker from `app/sw.ts` → `public/sw.js`, supports precache + `defaultCache` runtime caching, and auto-registers (or lets you register manually in a client component). Docs at `serwist.pages.dev/docs/next`.
- `web-push` (web-push-libs, **4.5M weekly downloads**, MPL-2.0) is the Node server-side library: `generateVAPIDKeys()`, `setVapidDetails()`, `sendNotification(subscription, payload)`. Browser support covers Chrome 50+, Edge 17+, Firefox 44+, **Safari 16+** (macOS 13+).
- For non-Next frameworks, `vite-plugin-pwa` (4,206★, 3.5M/wk) is the equivalent — only relevant if Q2 is revisited.

### Alternatives
- **SvelteKit / SolidStart / Nuxt** + `vite-plugin-pwa`: all viable PWAs, but each forces the Q2 split-stack decision (a separate frontend framework + backend). Next.js keeps it single-process. SvelteKit (20.7K★) and Nuxt (60.7K★) are healthy; SolidStart (5.9K★, 59K/wk) is smaller.

### Sources
- Serwist: https://serwist.pages.dev/docs/next/getting-started , https://serwist.pages.dev/docs/next/worker-exports , https://serwist.pages.dev/docs/next/configuring/register
- web-push: https://github.com/web-push-libs/web-push , npm registry `web-push` (4.5M/wk, MPL-2.0)
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa (4,206★, npm 1.3.0 / 3.5M/wk)
- GitHub API: `sveltejs/kit` (20,655★), `solidjs/solid-start` (5,890★), `nuxt/nuxt` (60,659★)

---

## Q4. (SOLID) DB + ORM — SQLite vs PostgreSQL, Drizzle vs Prisma

### Recommendation
**better-sqlite3 + Drizzle ORM**, with migrations via `drizzle-kit`. PostgreSQL + pgvector is the documented upgrade path, not the starting point.

### Reason
- **SQLite is enough for B-tier.** A handful of users, single instance, single compose service — a local SQLite file is the lowest-friction database that satisfies the app. `better-sqlite3` (7,347★, 7.5M/wk, pushed 2026-07-06) is synchronous, fast, and is one of the **sqlite-vec-confirmed** Node drivers.
- **Drizzle over Prisma for this app.** Drizzle (35.1K★, 12.7M/wk) supports `better-sqlite3`, `libsql`, `node:sqlite`, D1, and Bun out of one box; migration story is `drizzle-kit generate/migrate/push`; and it lets you run **raw SQL** (`db.all`, `db.execute`) — which is exactly how you'll query the sqlite-vec `vec0` virtual table. Drizzle wraps a `better-sqlite3` instance you control, so the integration is: `new Database(...)` → `sqliteVec.load(db)` → `drizzle(db)`. Drizzle is at v1.0 RC (docs: "98%"). Prisma (47K★, 13.6M/wk, **v7.8**) is excellent for relational CRUD and has migrations, but its higher abstraction makes `loadExtension` + `vec0` virtual-table queries less ergonomic, and its SQLite story has historically lagged Postgres.
- **Turso/libsql remote-replica:** Drizzle supports it (`@libsql/client` 0.17.4, 1.6M/wk), **but** the sqlite-vec official JS docs do **not** list libsql as a confirmed driver (they list `node:sqlite`, `better-sqlite3`, `node-sqlite3`, Deno `@db/sqlite`, `bun:sqlite`). So treat Turso as a *separate* later evaluation for multi-device sync, not the default — it would force a different vector path (libsql native vectors or pgvector).

### Alternatives
- **PostgreSQL + Drizzle + pgvector:** the scale-up path. Heavier (extra Postgres container), but gives HNSW ANN + `tsvector` full-text search. Note: Postgres FTS is **not Chinese-aware by default** — it needs the `zhparser` extension, so it does *not* eliminate the need for jieba-style tokenization. (See Q5.)
- **Prisma:** choose if you prefer a declarative schema + generated client and don't mind raw-SQL workarounds for `vec0`.

### Sources
- Drizzle SQLite drivers + migrations: https://orm.drizzle.team/docs/get-started-sqlite
- GitHub API (read 2026-07-10): `drizzle-team/drizzle-orm` (35,091★, pushed 2026-07-09, Apache-2.0), `prisma/prisma` (47,063★, v7.8.0), `WiseLibs/better-sqlite3` (7,347★, v12.11.1, 7.5M/wk), `tursodatabase/libsql` (16,940★)
- npm: `drizzle-orm` 0.45.2 (12.7M/wk), `prisma` 7.8.0 (13.6M/wk), `better-sqlite3` 12.11.1 (7.5M/wk), `@libsql/client` 0.17.4 (1.6M/wk)

---

## Q5. (DEEP) Vector store — in-DB (sqlite-vec / pgvector) vs standalone (Qdrant / Chroma)

### Recommendation
**sqlite-vec (in-process, in-DB).** Hybrid = sqlite-vec KNN (vector) + **in-app BM25** with `@node-rs/jieba` tokenization + **RRF fusion** in TS. Qdrant/Chroma are overkill and don't solve the actual hard part (Chinese BM25).

### Reason
This is a B-tier single-compose app doing hybrid retrieval for a handful of users. The right call minimizes services and keeps the Chinese-tokenization problem in one place.

**sqlite-vec (asg017/sqlite-vec, 7,846★, v0.1.9, 1.59M/wk, Apache-2.0):**
- Pure-C SQLite loadable extension; `vec0` virtual table stores `float`, `int8`, and `binary` vectors; metadata/auxiliary/partition-key columns supported.
- Query is **brute-force KNN** — `WHERE embedding MATCH ? ORDER BY distance LIMIT n`. **There is no ANN index** (the docs describe "extremely small, fast enough" linear scan, not HNSW/IVF). At B-tier scale (thousands to ~100K memory vectors) this is fine; use `int8`/binary vectors to shrink storage and speed the scan if needed.
- Confirmed Node drivers (official `site/using/js.md` + alexgarcia.xyz): `node:sqlite` (Node ≥23.5, `allowExtension:true`), **`better-sqlite3`**, `node-sqlite3`, Deno `@db/sqlite`, `bun:sqlite`. Load via `sqliteVec.load(db)`. Not listed: `libsql`/`@libsql/client`.

**pgvector (22,137★, pushed 2026-07-08, Postgres-only):**
- Real ANN — **HNSW** (m, ef_construction, hnsw.ef_search) and **IVFFlat**; operators `<->` `<#>` `<=>` `<+>`; types `vector` (≤2,000-d indexed), `halfvec`, `bit`, `sparsevec`. Scales far beyond sqlite-vec.
- Hybrid via Postgres `tsvector` + `ts_rank_cd` + RRF (the README explicitly recommends RRF or a cross-encoder). **But** Postgres FTS has no Chinese tokenizer out of the box — you must install the `zhparser` extension. So pgvector does *not* remove the jieba dependency; it just moves the tokenizer into Postgres.

**Qdrant (33,121★, Rust, Apache-2.0):**
- Best-in-class hybrid: the Query API takes multiple `prefetch` queries (dense + sparse) and fuses with **RRF** (v1.10+) or **DBSF** (v1.11+); HNSW + quantization. This is genuinely the most polished hybrid search.
- **But** the BM25 sparse-vector encoder is *not* in core Qdrant — it's via the companion FastEmbed (English-focused; SPLADE/BM25). For Chinese you'd compute sparse vectors yourself with jieba and push them in. So Qdrant adds a whole extra service (another container, another client, another failure mode) **without removing the Chinese-tokenization work**. For B-tier that's a bad trade.

**Chroma (28,753★, Rust/Python, Apache-2.0):** Python-first, simpler than Qdrant, but same "extra service, doesn't solve Chinese BM25" objection, and pulls the Python ecosystem back in.

**How hybrid gets implemented in the chosen path (concrete):**
1. Embed the memory via the API → store the vector in a `vec0` table (`memories_vec(embedding float[1536], ...)`).
2. Tokenize the query and each memory's text with `@node-rs/jieba.cut(text, true)` (HMM on) → compute BM25 scores in TS (your own small BM25 over an inverted index in SQLite, or rank `jieba` tokens with IDF stored alongside memories).
3. Run sqlite-vec KNN for the top-K_d dense hits; run BM25 for the top-K_s sparse hits; **fuse with Reciprocal Rank Fusion** (`score = Σ 1/(rrf_k + rank)`) in TS.
4. Optional reranker: a second LLM/cross-encoder call over the fused top-N.

This is the same hybrid structure Qdrant gives you, with zero extra services and the tokenizer already in-process.

### Alternatives
- **pgvector (HNSW)** when memory count grows past ~100K or latency budget tightens. Keep the in-app jieba BM25 (don't rely on `zhparser` unless you want to).
- **Qdrant** only if you later want managed-quality hybrid at scale and are OK with a second container + a custom Chinese sparse-vector encoder.

### Sources
- sqlite-vec: https://sqlite-vec.io , https://github.com/asg017/sqlite-vec , Node/Deno/Bun usage https://alexgarcia.xyz/sqlite-vec/js.html , https://github.com/asg017/sqlite-vec/blob/main/site/using/js.md
- pgvector: https://github.com/pgvector/pgvector (HNSW/IVFFlat, operators, hybrid with tsvector + RRF, Postgres 13+)
- Qdrant hybrid: https://qdrant.tech/documentation/concepts/hybrid-search/ (RRF/DBSF, prefetch, sparse vectors; BM25 via FastEmbed)
- GitHub API: `qdrant/qdrant` (33,121★, pushed 2026-07-10), `chroma-core/chroma` (28,753★), `asg017/sqlite-vec` (7,846★, v0.1.9 2026-03-31), `pgvector/pgvector` (22,137★)

---

## Q6. (DEEP) Chinese tokenization for BM25 in TS/JS

### Recommendation
**`@node-rs/jieba`** (napi-rs binding to jieba-rs, prebuilt binaries, 241K/wk). TS Chinese tokenization is **not** weak — no Python sidecar is justified.

### Reason
This was flagged as a real risk, so each candidate was checked for maintenance, native-build burden, and dictionary lineage.

| Package | Weekly DL | Repo | Last activity | Native build | Notes |
|---|---|---|---|---|---|
| **`@node-rs/jieba`** 2.0.1 | **241K** | `napi-rs/node-rs` (1,461★) | pushed 2026-07-09 | **prebuilt, no node-gyp** | jieba-rs lineage; faster than nodejieba |
| `nodejieba` 3.5.8 | 17K | `yanyiwu/nodejieba` (3,230★) | pushed 2026-06-28 | **C++ via node-gyp** (cppjieba) | maintained but build-painful for multi-arch docker |
| `jieba-wasm` 2.4.0 | 10K | `fengkx/jieba-wasm` (99★) | pushed 2026-01-27 | none (WASM) | jieba-rs → WASM; clean but small adoption |
| `jieba-js` 1.0.2 | 341 | `bluelovers/jieba-js` | — | none (pure JS) | effectively dead |
| Python `jieba` | — | `fxsjy/jieba` (35,055★) | pushed **2024-08-21** (~2yr stale) | — | canonical but unmaintained |

The evidence:
- **`@node-rs/jieba`** is a Rust binding (via napi-rs) to **jieba-rs**, which is a port of the same jieba project — so the dictionary is the same lineage as Python jieba. It supports `cut(text, hmm)`, `Jieba.withDict(customDict)`, `TfIdf.extractKeywords()` (keyword extraction), and POS tagging. The README explicitly states it is "prebuilt into binary already, so you don't need fighting with `node-gyp` and c++ toolchain" — this is the docker multi-arch concern solved (napi-rs ships prebuilt binaries for Linux x64/arm64, macOS x64/arm64, Windows).
- Its benchmarks beat `nodejieba` across the board (cut: 8,246 vs 6,392 ops/sec; tag: 11 vs 7 ops/sec) "because jieba-rs is 33% faster than cppjieba" and N-API is faster than the V8 C++ API.
- `nodejieba` is still maintained (v3.5.8, March 2026) but uses node-gyp/C++ — exactly the multi-arch docker build pain the dev worried about. `jieba-wasm` is a legitimate no-native-build alternative if you want to avoid native binaries entirely, but at 10K/wk and 99★ it's much less battle-tested.

**Verdict:** `@node-rs/jieba` is the clear, maintained, prebuilt, fast choice. The premise that "TS Chinese tokenization is weak, so we need a tiny Python sidecar" is **refuted by the 2026 evidence** — the TS binding is more actively maintained and faster than the canonical Python package, and it has 14× the weekly downloads of nodejieba.

### Alternatives
- **`jieba-wasm`** if you want zero native binaries (trade-off: smaller community).
- **`nodejieba`** if you specifically need the C++ cppjieba dictionary and accept node-gyp.
- A **Python sidecar** only if you later need NLP beyond tokenization (POS, NER) that jieba-rs lacks — not needed for BM25.

### Sources
- `@node-rs/jieba` README (prebuilt claim, benchmark vs nodejieba, API): https://github.com/napi-rs/node-rs/blob/main/packages/jieba/README.md
- GitHub API (read 2026-07-10): `napi-rs/node-rs` (1,461★, pushed 2026-07-09), `yanyiwu/nodejieba` (3,230★, v3.5.8 2026-03-23), `fengkx/jieba-wasm` (99★, pushed 2026-01-27), `fxsjy/jieba` (35,055★, pushed 2024-08-21)
- npm: `@node-rs/jieba` 2.0.1 (241K/wk), `nodejieba` 3.5.8 (17K/wk), `jieba-wasm` 2.4.0 (10K/wk), `jieba-js` 1.0.2 (341/wk)

---

## Q7. (SOLID) Monorepo — pnpm + Turborepo vs Nx vs bare pnpm workspaces

### Recommendation
**pnpm workspaces + Turborepo.** Bare pnpm workspaces is the minimal fallback; Nx is overkill.

### Reason
- **Turborepo (`vercel/turborepo`, 30,691★, v2.10.4, 17M/wk, MIT)** is a high-performance build system that reads your existing `package.json` scripts + workspace config and orchestrates tasks via one `turbo.json` (task `dependsOn`, `inputs`/`outputs`, caching). It works with **pnpm workspaces out of the box**, can be "adopted incrementally" in "a few minutes," and is independent of Nx. Remote Cache stores task results so CI "never needs to do the same work twice" — free via Vercel, which directly serves the "free GitHub Actions CI/CD" goal (faster CI runs).
- **Nx (`nrwl/nx`, 29,144★, v23, 8.8M/wk)** is more powerful (project graph, generators, `nx affected`, plugin ecosystem) but materially heavier config. For a small monorepo (one app + a few shared packages) it's more tool than task.
- **Bare pnpm workspaces** (pnpm 35,736★, 216M… actually pnpm is the package manager) is the simplest option and works fine, but you lose task caching/parallelism — every CI run re-runs everything. For a repo that will have `lint/typecheck/unit/e2e/build` across packages, Turborepo's caching is worth the ~zero config.

For this repo's size (apps/web + packages/{db,memory,ai,cron,push,config}), Turborepo is the sweet spot: one `turbo.json` with `build`, `test`, `lint`, `typecheck` tasks; `dependsOn: [^build]` for the app depending on packages; remote cache for CI.

### Alternatives
- **Bare pnpm workspaces** if you want zero extra tooling and don't care about CI caching yet.
- **Nx** if the monorepo grows to many apps/packages and you want generators + affected-command detection.

### Sources
- Turborepo docs: https://turborepo.dev/repo/docs (task orchestration, pnpm-compatible, incremental adoption, remote cache)
- GitHub API (read 2026-07-10): `vercel/turborepo` (30,691★, v2.10.4 2026-07-06), `nrwl/nx` (29,144★, v23.0.1), `pnpm/pnpm` (35,736★, pushed 2026-07-10)
- npm: `turbo` 2.10.4 (17M/wk), `nx` 23.0.1 (8.8M/wk)

---

## Q8. (CONCISE) Testing stack in TS

### Recommendation
**Vitest (unit + route-handler tests) + Playwright (browser E2E + API E2E via `APIRequestContext`).** Testcontainers only if/when Postgres/Qdrant is adopted (not needed for SQLite).

### Reason
- **Vitest (`vitest-dev/vitest`, 16,828★, v4.1.10, 71.7M/wk)** — the standard TS unit runner (Vite-powered, Jest-compatible). For Next.js API tests, import route handlers (`GET`/`POST`) directly in Vitest and call them with a constructed `Request` — no HTTP server needed.
- **Playwright (`microsoft/playwright`, 92,565★, v1.61.1, 43.8M/wk)** — cross-browser E2E, and its `APIRequestContext` is the modern "supertest equivalent" for HTTP-level API E2E against a running server. Also the right tool for PWA/web-push flows (installability, service-worker registration, notification permission).
- **supertest (`ladjs/supertest` on npm / `forwardemail/supertest` repo, 14,385★, v7.2.2, 14.9M/wk)** — still maintained; usable if you spin up `next start` and want classic Express-style HTTP assertions, but Playwright's request API is cleaner for this stack.
- **Testcontainers (`testcontainers-node`, 2,565★, v12.0.4, 4.5M/wk)** — only relevant for spinning up Postgres/Qdrant in integration tests. With SQLite in-process (`:memory:` or a temp file), there's nothing to containerize, so it's optional now and on the upgrade path later.

### Alternatives
- **supertest + `next start`** if you prefer HTTP-level API tests over direct handler calls.
- **Testcontainers** when you migrate to Postgres/Qdrant.

### Sources
- GitHub API (read 2026-07-10): `vitest-dev/vitest` (16,828★, v4.1.10), `microsoft/playwright` (92,565★, v1.61.1), `testcontainers/testcontainers-node` (2,565★, v12.0.4), `forwardemail/supertest` (14,385★, v7.2.2)
- npm: `vitest` 4.1.10 (71.7M/wk), `@playwright/test` 1.61.1 (43.8M/wk), `testcontainers` 12.0.4 (4.5M/wk), `supertest` 7.2.2 (14.9M/wk)

---

## Q9. (CONCISE) cron in docker compose

### Recommendation
**`node-cron` in-app** (registered once on server startup, e.g. in `instrumentation.ts`). Cleanest for jobs that need the app's DB/AI clients. `supercronic` is the alternative if you want crontab-as-config; `ofelia` is overkill.

### Reason
- **`node-cron` (`node-cron/node-cron`, 3,265★, v4.6.0, 6.8M/wk, ISC)** runs in the Node process — zero extra containers, and the maintenance jobs (embedding, summarization, graph, forgetting, briefing, proactive care) all need the app's SQLite handle + AI gateway + memory engine anyway, so in-process is the natural fit. B-tier = single instance, so the "multiple replicas duplicate cron" concern doesn't apply. Register jobs once on boot; guard against double-registration in Next dev hot-reload.
- **supercronic (`aptible/supercronic`, 2,573★, v0.2.47 2026-07-03, Go)** — cron-for-containers: single binary, foreground (no daemon), inherits env vars, logs to stdout/stderr, graceful SIGTERM, crontab file, second-resolution. 12-factor friendly. Use it if you want scheduling decoupled from app code (crontab invokes `node` scripts or `curl`s an internal endpoint). Slightly more wiring than node-cron for jobs that need DB access.
- **ofelia (`mcuadros/ofelia`, 3,921★, v0.3.22 2026-04-11, Go)** — Docker scheduler that `docker exec`s into containers or runs new ones via the Docker API; config via INI or container labels. Requires mounting `/var/run/docker.sock` (a security exposure) and adds a second container. Most "docker-native" but heaviest; not worth it for this app.

### Alternatives
- **supercronic** in the same container (or a sidecar) if you want crontab-as-config and 12-factor logging.
- **ofelia** only if you specifically want Docker-API-driven scheduling across multiple containers.

### Sources
- ofelia: https://github.com/mcuadros/ofelia (v0.3.22, job-exec/job-run/job-local, cron + `@every`, Docker socket)
- supercronic: https://github.com/aptible/supercronic (v0.2.47, foreground, env inheritance, SIGTERM, crontab)
- node-cron: https://github.com/node-cron/node-cron (v4.6.0)
- npm: `node-cron` 4.6.0 (6.8M/wk), `cron` 4.4.0 (5.9M/wk — the parser/scheduler lib, distinct from `node-cron`)

---

## Q10. (CONCISE) SSE streaming + Anthropic prompt caching in the chosen framework

### Recommendation
**Next.js route handler returns the AI SDK `streamText` stream as a `Response`; `@ai-sdk/anthropic` sets `cache_control` breakpoints via `providerOptions`. Fully supported, no blocker.**

### Reason
- **Anthropic prompt caching (primary source):** mark a content block with `"cache_control": { "type": "ephemeral" }` (optionally `"ttl": "1h"` for the 1-hour cache). Up to **4 breakpoints** per request. Default TTL **5 minutes**, refreshed free on each hit. Pricing: **1.25×** base for 5-min cache writes, **2.0×** for 1-hour writes, **0.1×** for cache reads. Minimum cacheable prompt: **1,024 tokens** for Claude Opus 4.8 / Sonnet 4.5 / Sonnet 4 (4,096 for Haiku 4.5 / Opus 4.5). During **streaming**, the cache usage fields (`cache_creation_input_tokens`, `cache_read_input_tokens`) arrive in the **`message_start`** SSE event.
- **Anthropic SSE streaming (primary source):** set `"stream": true`; event types include `message_start`, `content_block_delta` (with `text_delta`), `content_block_stop`, `message_delta`, `message_stop`. The TS SDK streams via `client.messages.stream({...}).on("text", ...)` (and Python/PHP equivalents).
- **AI SDK wires both together:** `@ai-sdk/anthropic` exposes cache control through `providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } }` on system messages, user content parts, and tools; the **1-hour TTL** is `{ type: 'ephemeral', ttl: '1h' }`. Cache read/write token counts come back on `result.usage.inputTokenDetails.cacheReadTokens` / `cacheWriteTokens` for both `generateText` and **`streamText`**. The provider is configured with `createAnthropic({ baseURL, apiKey, headers, authToken, fetch })` — so BYOK + a self-hosted Anthropic-compatible proxy is a `baseURL` change. For OpenAI-compatible self-hosted targets (Ollama, vLLM, LM Studio), `createOpenAI({ baseURL })` and use `openai.chat('model')` (since AI SDK v5 the OpenAI provider defaults to the Responses API, which local servers don't implement).
- **Next.js side:** a route handler returns `new Response(result.toTextStream())` (or `StreamingTextResponse`) with the right SSE headers — the Next.js route-handler docs show exactly this `streamText` + `StreamingTextResponse` pattern.

### Alternatives
- **`@anthropic-ai/sdk` directly (0.110.0, 24.4M/wk)** if you want to skip the AI SDK abstraction for the Anthropic path and call `client.messages.stream({ system: [{ text, cache_control: { type: 'ephemeral' } }], ... })` yourself. Loses the single-provider-agnostic gateway, but maximally direct.

### Sources
- Anthropic prompt caching: https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching (cache_control ephemeral, 4 breakpoints, 5-min/1h TTL, 1.25×/2.0×/0.1× pricing, 1024-token min, streaming via message_start)
- Anthropic streaming: https://platform.claude.com/docs/en/docs/build-with-claude/streaming (SSE events, TS SDK `client.messages.stream().on("text")`)
- AI SDK Anthropic provider (cacheControl + baseURL + streamText + thinking + tools + PDFs): https://ai-sdk.dev/v7/providers/ai-sdk-providers/anthropic
- AI SDK OpenAI provider (baseURL for self-hosted, `.chat()` for Chat Completions): https://ai-sdk.dev/v7/providers/ai-sdk-providers/openai
- Next.js route handlers streaming + AI SDK: https://nextjs.org/docs/app/api-reference/file-conventions/route
- GitHub: `anthropics/anthropic-sdk-typescript` (2,036★, v0.110.0, 24.4M/wk), `vercel/ai` (25,464★, v7, 15.9M/wk)

---

## Proposed stack

### Monorepo layout (pnpm workspaces + Turborepo)

```
mindweft/
├─ apps/
│  └─ web/                      # Next.js 16 full-stack app (single deployable)
│     ├─ app/
│     │  ├─ api/
│     │  │  ├─ chat/route.ts          # SSE: AI SDK streamText → Response (cache_control)
│     │  │  └─ push/subscribe/route.ts
│     │  ├─ (routes, components, layout)
│     │  └─ sw.ts                     # Serwist service worker source
│     ├─ instrumentation.ts           # registers node-cron jobs once on server start
│     ├─ next.config.ts               # output:'standalone', withSerwist, outputFileTracingRoot=monorepo root
│     └─ Dockerfile                   # multi-stage standalone (based on vercel/next.js examples/with-docker)
├─ packages/
│  ├─ db/                       # Drizzle schema + better-sqlite3 + sqlite-vec loader + drizzle-kit migrations
│  ├─ memory/                   # embedding API client, sqlite-vec KNN, BM25 (@node-rs/jieba), RRF fusion, memory graph, forgetting curve
│  ├─ ai/                       # AI gateway: createAnthropic/createOpenAI providers, baseURL config, cacheControl helpers
│  ├─ cron/                     # node-cron job definitions: embedding/summarization/graph/forgetting/briefing/proactive
│  ├─ push/                     # web-push VAPID keys + sendNotification
│  └─ config/                   # shared tsconfig, eslint, prettier
├─ turbo.json                   # tasks: build/test/lint/typecheck/e2e with dependsOn + inputs/outputs + cache
├─ pnpm-workspace.yaml
├─ docker-compose.yml           # one service (web) + a volume for the SQLite db file (+ Caddy for TLS when needed)
└─ .github/workflows/ci.yml     # lint + typecheck + unit(vitest) + e2e(playwright) + build + deploy (one pipeline)
```

### Picked library per layer (manifest)

| Layer | Pick | Version / signal (read 2026-07-10) |
|---|---|---|
| Language | TypeScript | 7.0.2 |
| Monorepo | pnpm workspaces + Turborepo | turbo 2.10.4 (17M/wk) |
| Full-stack framework | Next.js (App Router, route handlers, `output:'standalone'`) | next 16.2.10 (41.8M/wk) |
| AI gateway | Vercel AI SDK: `ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai` | ai 7.0.19 (15.9M/wk) |
| Anthropic SDK (direct, optional) | `@anthropic-ai/sdk` | 0.110.0 (24.4M/wk) |
| SSE streaming | Next.js route handler + AI SDK `streamText` → `Response` | — |
| Prompt caching | `providerOptions.anthropic.cacheControl = { type:'ephemeral' }` (+ `ttl:'1h'`) | — |
| DB driver | `better-sqlite3` | 12.11.1 (7.5M/wk) |
| ORM / migrations | Drizzle ORM + `drizzle-kit` | drizzle-orm 0.45.2 (12.7M/wk) |
| Vector store | `sqlite-vec` (`vec0` virtual table, brute-force KNN) | 0.1.9 (1.59M/wk) |
| Hybrid search | sqlite-vec KNN + in-app BM25 + RRF fusion (in `packages/memory`) | — |
| Chinese tokenizer | `@node-rs/jieba` (napi-rs, prebuilt, jieba-rs lineage) | 2.0.1 (241K/wk) |
| Memory graph | SQLite tables (nodes/edges) via Drizzle | — |
| Forgetting curve | in-app Ebbinghaus scheduler (cron-updated) | — |
| cron | `node-cron` (in-process, registered in `instrumentation.ts`) | 4.6.0 (6.8M/wk) |
| PWA / service worker | Serwist (`@serwist/next`) | latest |
| Web push (server) | `web-push` (VAPID) | 4.5M/wk |
| Auth (B-tier, simple) | HTTP-only cookie session + password hash in SQLite, gated by Next.js middleware (or Auth.js if OAuth needed) | — |
| Unit + API tests | Vitest | 4.1.10 (71.7M/wk) |
| E2E + API E2E | Playwright (+ `APIRequestContext`) | 1.61.1 (43.8M/wk) |
| Integration DB (later) | Testcontainers-node (only on Postgres/Qdrant upgrade) | 12.0.4 (4.5M/wk) |
| Lint/format | ESLint + Prettier (shared in `packages/config`) | — |
| CI/CD | GitHub Actions (lint+typecheck+unit+e2e+build+deploy), Turborepo remote cache | free |
| Deploy | docker compose, single service (Next.js standalone) + SQLite volume | no serverless |

---

## Open risks / follow-ups

1. **sqlite-vec has no ANN (brute-force KNN only).** Fine at B-tier (≤~100K memory vectors; use `int8`/binary vectors to keep scan fast). Migration path if scale grows: **pgvector (HNSW)** — but keep the in-app `@node-rs/jieba` BM25 (Postgres FTS needs `zhparser` for Chinese, so pgvector doesn't remove the tokenizer). Qdrant only if you want a second container + custom Chinese sparse-vector encoding.
2. **libsql/Turso is not confirmed sqlite-vec-compatible** (official JS driver list omits it). Use `better-sqlite3` local file now. If multi-device sync becomes a real need, evaluate libsql's own vector support or switch to Postgres+pgvector — treat Turso as a separate decision, not the default.
3. **node-cron runs in the web process.** Long CPU-heavy maintenance jobs (BM25 over a large memory set) can block the event loop. If jobs grow heavy, split a separate Node worker process (same TS monorepo, a `apps/worker` package) and consider `supercronic` or a worker service. Also guard against double-registration in Next dev hot-reload (idempotent scheduler singleton).
4. **Safari web push requires an `https:` VAPID subject** (not `localhost`) — self-hosting needs a real domain + TLS. Plan TLS termination (Caddy or similar) in `docker-compose.yml` for production push to iOS/Safari.
5. **Next.js route handlers must use the Node.js runtime** for better-sqlite3 / sqlite-vec (set `export const runtime = 'nodejs'`; do not use the Edge runtime on those routes). better-sqlite3 is Node-only.
6. **Drizzle is v1.0 RC** (docs say 98%). Stable enough to build on; track the v1.0 final and pin accordingly.
7. **`@node-rs/jieba` dictionary is jieba-rs lineage** — equivalent to Python jieba but not byte-identical. Validate segmentation on your actual corpus and add a custom dictionary for domain terms if recall suffers.
8. **AI SDK v7 OpenAI provider defaults to the Responses API**; local OpenAI-compatible servers (Ollama, LM Studio, vLLM) only implement Chat Completions — use `openai.chat('model')` explicitly, or the OpenAI-compatible provider, when pointing `baseURL` at a self-hosted local server.
9. **Anthropic prompt-cache minimum is 1,024 tokens** (Opus 4.8 / Sonnet 4.x). The static system prefix (persona + memory briefing) should exceed that before caching pays off; verify `cache_creation_input_tokens` / `cache_read_input_tokens` are non-zero in the `message_start` event once wired.
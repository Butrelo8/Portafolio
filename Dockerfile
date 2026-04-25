# syntax=docker/dockerfile:1
# API only (Hono + Bun). `web/` is excluded via .dockerignore — deploy Astro separately if needed.

FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY scripts ./scripts

RUN bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1.3 AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 65532 nonroot \
  && useradd --system --uid 65532 --gid nonroot --shell /usr/sbin/nologin nonroot

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./

RUN chown -R nonroot:nonroot /app
USER nonroot

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "dist/index.js"]

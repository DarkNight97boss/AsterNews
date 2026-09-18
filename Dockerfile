# ASTER News in un container: build autonoma di Next.js, utente non privilegiato, dati su volume.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 DOCKER_BUILD=1
RUN npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 aster && mkdir -p /app/data /app/public/uploads && chown -R aster /app
COPY --from=build --chown=aster /app/.next/standalone ./
COPY --from=build --chown=aster /app/.next/static ./.next/static
COPY --from=build --chown=aster /app/public ./public
# PGlite (database incorporato, usato solo se non imposti DATABASE_URL) e sharp hanno file nativi fuori dal tracciamento automatico
COPY --from=build --chown=aster /app/node_modules/@electric-sql ./node_modules/@electric-sql
COPY --from=build --chown=aster /app/node_modules/sharp ./node_modules/sharp
COPY --from=build --chown=aster /app/node_modules/@img ./node_modules/@img
USER aster
VOLUME ["/app/data", "/app/public/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/api/v1/site').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

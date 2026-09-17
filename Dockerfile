# syntax=docker/dockerfile:1
#
# Three real targets, not one straight-through build:
#   deps      - shared `npm ci`, cached as its own layer
#   build     - `ng build --configuration production` (Angular app only)
#   mock-api  - runs mock-api/server.ts via tsx (no build step: tsx runs the
#               TypeScript source directly, same as `npm run mock-api` locally)
#   runtime   - nginx serving `build`'s static output (the image actually
#               named/tagged by a plain `docker build .` with no --target,
#               since it is the last stage)
#
# docker-compose.yml builds both `mock-api` and `runtime` from this one file
# via `target:`, rather than maintaining two separate Dockerfiles for one
# repo this size.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Every stage below needs devDependencies too: `build` needs @angular/cli and
# typescript, `mock-api` needs tsx. There is no separate "production
# dependencies" stage because nothing in this repo's own runtime code (the
# mock API) ships as anything other than TypeScript run directly by tsx.
RUN npm ci

FROM deps AS build
COPY . .
RUN npx ng build --configuration production

FROM deps AS mock-api
COPY mock-api ./mock-api
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "tsx", "mock-api/server.ts"]

FROM nginx:1.29-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
# The new (esbuild-based) Angular application builder emits the static site
# under an extra `browser/` directory inside outputPath (dist/lumen-ops),
# alongside server-only artifacts (stats.json, prerendered-routes.json) that
# do not belong in a static image - only `browser/` is copied.
COPY --from=build /app/dist/lumen-ops/browser /usr/share/nginx/html
EXPOSE 80

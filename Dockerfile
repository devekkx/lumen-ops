FROM node:24.21.0-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx ng build --configuration production

FROM deps AS mock-api
COPY mock-api ./mock-api
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "tsx", "mock-api/server.ts"]

# Pinned by digest, not a version tag: Chainguard's free tier only publishes
# :latest/:latest-dev (pinned semantic-version tags need a paid plan), and
# :latest is exactly that - a moving target - without a digest. This digest
# is what :latest resolved to at the time this was pinned (checked against
# the registry's own manifest API); Chainguard rebuilds :latest continuously
# to stay at zero CVEs, so this pin should be refreshed periodically rather
# than left to go stale indefinitely - freezing it forever defeats the
# reason this image was chosen over a version-pinned one in the first place.
FROM cgr.dev/chainguard/nginx@sha256:d770a59f02e443a1403d44f4d6c0eb74b076a2433f3df9e0f4782fe4bff2ac22 AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/lumen-ops/browser /usr/share/nginx/html
EXPOSE 8080

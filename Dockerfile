FROM node:24.8.0-alpine3.24 AS deps
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

FROM nginxinc/nginx-unprivileged:1.29.1-alpine3.22 AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/lumen-ops/browser /usr/share/nginx/html
EXPOSE 8080

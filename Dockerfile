# syntax=docker/dockerfile:1
#
# Здам for tables-host: builds the web app and runs the small sync server.
# The built app is left at /web; tables-host's Caddy image copies it from here and serves it,
# and sends /api/* to this container on port 3000.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
COPY server/server.mjs ./
COPY --from=build /app/dist /web
# Progress lives in /data (a named volume in tables-host), owned by the unprivileged node user.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=1m --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.mjs"]

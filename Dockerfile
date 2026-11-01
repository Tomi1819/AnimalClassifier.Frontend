# The website, built with Node and served by Caddy, which also passes the API's
# requests on, so that the browser sees one address and CORS never applies.

FROM node:24.22.2-slim AS build
WORKDIR /src

# The package files alone first, so that packages are installed again only when
# these change, rather than on every change to the code.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty, so that requests go to the address the site itself is served from.
RUN VITE_API_BASE_URL= npm run build


FROM caddy:2.11.7-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv

# Fails the build here, rather than the container later, on a mistake in the file.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# The image lets its binary take low ports, a right that stops it starting at all
# once a container has dropped its capabilities. It only needs port 8080.
RUN setcap -r /usr/bin/caddy

# Somewhere a non-root user can write, though with HTTPS handled in front of it
# Caddy has no certificates to keep.
ENV XDG_DATA_HOME=/tmp/caddy XDG_CONFIG_HOME=/tmp/caddy
USER 1000:1000

EXPOSE 8080

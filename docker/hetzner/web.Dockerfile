FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/profile-resolver/package.json packages/profile-resolver/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ARG VITE_TUNNEL_STATUS=production:hetzner
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_TUNNEL_STATUS=${VITE_TUNNEL_STATUS}

RUN pnpm --filter @gratonite/web build

FROM nginx:1.27-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/hetzner/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

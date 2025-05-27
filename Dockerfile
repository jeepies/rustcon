FROM node:18-alpine AS builder

RUN apk add --no-cache \
      git \
      python3 \
      g++ \
      make

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM debian:bullseye-slim

RUN groupadd --system app \
 && useradd  --system --gid app --home-dir /home/app --create-home app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      wget \
      unzip \
      netcat \
 && rm -rf /var/lib/apt/lists/*

ARG RUST_VERSION=2025.05.01
ARG RUST_SHA256=PUT_THE_REAL_SHA256_HASH_HERE
RUN wget -qO /tmp/RustDedicated.zip \
      https://github.com/Facepunch/rust/releases/download/${RUST_VERSION}/RustDedicated.zip \
 && echo "${RUST_SHA256}  /tmp/RustDedicated.zip" | sha256sum -c - \
 && unzip /tmp/RustDedicated.zip -d /opt/rust \
 && rm /tmp/RustDedicated.zip

WORKDIR /app
COPY --from=builder /app ./

USER app

EXPOSE 28016 28015

HEALTHCHECK --interval=10s --timeout=3s \
  CMD nc -z localhost 28016 || exit 1

COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

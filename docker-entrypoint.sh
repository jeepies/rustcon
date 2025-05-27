#!/usr/bin/env sh
set -e

/opt/rust/RustDedicated \
  +rcon.port 28016 \
  +rcon.password testpass \
  +server.port 28015 &

echo "Waiting for RustDedicated/RCON..."
while ! nc -z localhost 28016; do
  sleep 1
done

echo "RCON ready — running integration tests"
npm run test:integration

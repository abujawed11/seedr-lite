#!/bin/sh
# aria2 entrypoint — all config comes from environment variables

exec aria2c \
  --enable-rpc \
  --rpc-listen-all=true \
  --rpc-listen-port=${ARIA2_RPC_PORT:-6800} \
  --rpc-secret=${ARIA2_SECRET:-seedr_aria2_secret} \
  --dir=${ARIA2_DOWNLOAD_DIR:-/downloads} \
  --seed-ratio=0 \
  --seed-time=0 \
  --max-connection-per-server=16 \
  --split=16 \
  --min-split-size=1M \
  --bt-enable-lpd=true \
  --continue=true \
  --always-resume=true \
  --file-allocation=none \
  --console-log-level=warn \
  --bt-seed-unverified=true \
  --follow-torrent=true \
  --bt-save-metadata=true \
  --dht-entry-point=dht.transmissionbt.com:6881 \
  --dht-entry-point6=dht.transmissionbt.com:6881

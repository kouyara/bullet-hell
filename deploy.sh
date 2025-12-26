#!/bin/bash
set -e

# ローカルPCからサーバーへファイルを転送
wasm-pack build --target web --release
rm -rf www/pkg
cp -r pkg www/
rsync -avz --delete -e ssh \
  --exclude='target' \
  --exclude='/pkg' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  /Users/kouya/coding/rust_project/ \
  react_web:/opt/bullet-hell/
ssh react_web "cd /opt/bullet-hell && docker compose -f docker-compose.prod.yml restart frontend"
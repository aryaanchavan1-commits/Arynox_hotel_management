#!/usr/bin/env bash
# Turso database setup (create database + token) - run once
# 1. Install CLI:  curl -sSfL https://get.turso.tech/install.sh | bash
# 2. Login:        turso auth login
# 3. Run this:     bash scripts/setup-turso.sh my-db-name
set -e
DB_NAME="${1:-arynox-hotel-management}"

if ! command -v turso &>/dev/null; then
  echo "Turso CLI not found. Install: curl -sSfL https://get.turso.tech/install.sh | bash"
  exit 1
fi

echo "Creating Turso database '$DB_NAME' ..."
turso db create "$DB_NAME" --location aws-ap-northeast-1

URL=$(turso db show "$DB_NAME" --url)
TOKEN=$(turso db tokens create "$DB_NAME")

echo ""
echo "Add these to .env:"
echo "TURSO_DATABASE_URL=$URL"
echo "TURSO_AUTH_TOKEN=$TOKEN"
echo ""
echo "DONE. Copy the values into .env"
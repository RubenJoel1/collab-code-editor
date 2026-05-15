#!/bin/bash
# Run this locally after AWS CLI is configured.
# Usage: ./scripts/deploy-client.sh <S3_BUCKET> <CLOUDFRONT_DIST_ID> <SERVER_URL>
# Example: ./scripts/deploy-client.sh my-collab-editor-bucket E1ABC123 http://1.2.3.4:3001

set -e

S3_BUCKET=$1
CF_DIST_ID=$2
SERVER_URL=$3

if [ -z "$S3_BUCKET" ] || [ -z "$CF_DIST_ID" ] || [ -z "$SERVER_URL" ]; then
  echo "Usage: $0 <S3_BUCKET> <CLOUDFRONT_DIST_ID> <SERVER_URL>"
  exit 1
fi

echo "Building client..."
cd "$(dirname "$0")/../client"
VITE_SERVER_URL="$SERVER_URL" npm run build

echo "Uploading to s3://$S3_BUCKET ..."
aws s3 sync dist/ "s3://$S3_BUCKET" --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*"

echo "Done. Your app is live."

#!/usr/bin/env bash
#
# Subscribe Facebook Page to the Meta App for Leadgen Webhooks
#
# Usage:
#   PAGE_ID="<your-page-id>" PAGE_ACCESS_TOKEN="<your-page-token>" ./subscribe-page.sh
#

set -euo pipefail

PAGE_ID="${PAGE_ID:-${1:-}}"
PAGE_ACCESS_TOKEN="${PAGE_ACCESS_TOKEN:-${2:-}}"

if [ -z "$PAGE_ID" ] || [ -z "$PAGE_ACCESS_TOKEN" ]; then
  echo "Usage:"
  echo "  PAGE_ID=\"<page-id>\" PAGE_ACCESS_TOKEN=\"<page-token>\" ./subscribe-page.sh"
  echo "Or:"
  echo "  ./subscribe-page.sh <page-id> <page-token>"
  exit 1
fi

echo "Subscribing Page: $PAGE_ID to App Leadgen Webhooks..."

RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps" \
  -d "subscribed_fields=leadgen" \
  -d "access_token=${PAGE_ACCESS_TOKEN}")

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "SUCCESS! The Page has been subscribed to leadgen webhooks."
  echo "Meta will now stream instant form leads directly to your webhook URL."
else
  echo "Subscription failed or unexpected response. Please check permissions."
fi

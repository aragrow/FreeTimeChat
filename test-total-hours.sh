#!/bin/bash

# Login and get token
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantKey":"ARAGROW-LLC","email":"admin@freetimechat.local","password":"Admin123!"}')

TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "✓ Got authentication token"
echo ""

# Get projects
echo "Fetching first project..."
curl -s "http://localhost:3001/api/v1/admin/projects?take=2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.data.projects[0] | {name, totalHours, allocatedHours, additionalHoursAllocated, timeEntriesCount: ._count.timeEntries}'

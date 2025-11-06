#!/bin/bash

# Script to update admin pages to use JWT auth instead of cookie auth

ADMIN_PAGES=(
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/dashboard/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/[id]/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/roles/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/projects/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/time-entries/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/audit/page.tsx"
  "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/reports/page.tsx"
)

for file in "${ADMIN_PAGES[@]}"; do
  echo "Processing: $file"

  # Check if file has useAuth import
  if ! grep -q "import { useAuth } from '@/hooks/useAuth';" "$file"; then
    # Add useAuth import after other imports
    sed -i '' "/^import.*from 'react';$/a\\
import { useAuth } from '@/hooks/useAuth';
" "$file"
  fi

  # Add getAuthHeaders to useAuth destructuring if useAuth() is called
  if grep -q "const .* = useAuth();" "$file"; then
    # Check if getAuthHeaders is already there
    if ! grep -q "getAuthHeaders" "$file"; then
      # Add getAuthHeaders to the destructuring
      sed -i '' 's/const { \(.*\) } = useAuth();/const { \1, getAuthHeaders } = useAuth();/' "$file"
    fi
  fi

  # Replace credentials: 'include' with headers: getAuthHeaders()
  # For GET requests (no Content-Type needed)
  sed -i '' "s/credentials: 'include',$/headers: getAuthHeaders(),/" "$file"

  # For POST/PUT/DELETE with Content-Type already present
  # Pattern: headers: { 'Content-Type': ... }, credentials: 'include'
  sed -i '' "s/\(headers: {\)\( *\)\('Content-Type':.*\),\( *\)credentials: 'include',/\1 ...getAuthHeaders(),\2\3/" "$file"

  echo "  ✓ Updated $file"
done

echo "All admin pages updated successfully!"

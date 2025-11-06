#!/usr/bin/env python3

import re

files_to_fix = [
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/[id]/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/time-entries/page.tsx",
]

for filepath in files_to_fix:
    with open(filepath, 'r') as f:
        content = f.read()

    # Pattern to match:
    # headers: {
    #   'Content-Type': 'application/json',
    # },
    # headers: getAuthHeaders(),

    # Replace with:
    # headers: {
    #   ...getAuthHeaders(),
    #   'Content-Type': 'application/json',
    # },

    pattern = r"headers: {\s*'Content-Type': 'application/json',\s*},\s*headers: getAuthHeaders\(\),"
    replacement = "headers: {\n          ...getAuthHeaders(),\n          'Content-Type': 'application/json',\n        },"

    new_content = re.sub(pattern, replacement, content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed duplicate headers in: {filepath}")
    else:
        print(f"No changes needed in: {filepath}")

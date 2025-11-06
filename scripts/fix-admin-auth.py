#!/usr/bin/env python3

import re
import sys

admin_files = [
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/audit/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/users/[id]/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/roles/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/projects/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/time-entries/page.tsx",
    "/Users/david/Documents/nextjs/FreeTimeChat/apps/web/src/app/admin/reports/page.tsx",
]

for filepath in admin_files:
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Check if getAuthHeaders is already declared
    has_get_auth_headers = any('const { getAuthHeaders } = useAuth();' in line for line in lines)

    if not has_get_auth_headers:
        # Find the component function line
        new_lines = []
        added = False
        for i, line in enumerate(lines):
            new_lines.append(line)
            # Add after the function declaration, before first const
            if not added and 'export default function' in line:
                # Find the next line with const
                j = i + 1
                while j < len(lines) and 'const' not in lines[j]:
                    new_lines.append(lines[j])
                    j += 1
                # Add getAuthHeaders before first const
                new_lines.append('  const { getAuthHeaders } = useAuth();\n')
                added = True
                # Add the rest
                new_lines.extend(lines[j:])
                break

        if added:
            with open(filepath, 'w') as f:
                f.writelines(new_lines)
            print(f"Fixed: {filepath}")
        else:
            print(f"Could not fix: {filepath}")
    else:
        print(f"Already has getAuthHeaders: {filepath}")

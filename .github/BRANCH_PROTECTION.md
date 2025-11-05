# Branch Protection Rules

## Main Branch Protection

Configure the following branch protection rules for the `main` branch on GitHub:

### Required Settings

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals when new commits are pushed: ✓
   - Require review from Code Owners: ✓ (if CODEOWNERS file exists)

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✓
   - Status checks that are required:
     - `test` - All tests must pass
     - `lint` - Linting must pass
     - `build` - Build must succeed

3. **Require conversation resolution before merging**
   - All conversations must be resolved: ✓

4. **Require signed commits**: ✓ (recommended)

5. **Require linear history**: ✓
   - This prevents merge commits and keeps history clean

6. **Include administrators**: ✓
   - These rules apply to administrators as well

7. **Restrict who can push to matching branches**
   - Only allow specific users/teams to push directly (optional)

8. **Allow force pushes**: ✗
   - Prevent force pushes to protect history

9. **Allow deletions**: ✗
   - Prevent branch deletion

## How to Configure (GitHub Web UI)

1. Go to: `https://github.com/aragrow/FreeTimeChat/settings/branches`
2. Click "Add rule" under "Branch protection rules"
3. Enter `main` as the branch name pattern
4. Enable the settings listed above
5. Click "Create" to save

## How to Configure (GitHub CLI)

If you have GitHub CLI installed, run:

```bash
gh repo edit aragrow/FreeTimeChat \
  --enable-issues=true \
  --enable-projects=true \
  --enable-wiki=false

# Enable branch protection for main
gh api repos/aragrow/FreeTimeChat/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=test \
  --field required_status_checks[contexts][]=lint \
  --field required_status_checks[contexts][]=build \
  --field enforce_admins=true \
  --field required_pull_request_reviews[dismissal_restrictions][users][]=[] \
  --field required_pull_request_reviews[dismissal_restrictions][teams][]=[] \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=true \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true
```

## Notes

- These rules ensure code quality and prevent accidental direct pushes to main
- All changes must go through pull requests with reviews
- Tests, linting, and builds must pass before merging
- History remains linear and protected from force pushes

## Related

- See [git.md](../.claude/git.md) for commit workflow
- See [code.md](../.claude/code.md) for code standards

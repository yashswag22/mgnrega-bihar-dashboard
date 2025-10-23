# scripts/push-main.ps1
# Creates (if necessary) and switches to 'main' branch, then pushes to origin and sets upstream.
param(
  [string]$remote = 'origin'
)

# ensure in repo
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  Write-Error "Not inside a git repository"
  exit 1
}

# fetch to update refs
git fetch $remote --prune

# check if main exists locally
$exists = git show-ref --verify --quiet refs/heads/main; $rc = $LASTEXITCODE
if ($rc -ne 0) {
  Write-Host "Creating 'main' branch from current branch..."
  git branch -m main
} else {
  Write-Host "Switching to existing 'main' branch..."
  git checkout main
}

# push and set upstream
Write-Host "Pushing 'main' to $remote and setting upstream..."
git push -u $remote main

Write-Host "Done. 'main' pushed to $remote."
# Fix formatting issues in the codebase
Write-Host "Fixing formatting issues..."

# Run ESLint with --fix option
npm run lint -- --fix

# Check if there are any remaining issues
$lintResult = npm run lint
if ($LASTEXITCODE -eq 0) {
    Write-Host "All formatting issues have been fixed successfully!" -ForegroundColor Green
} else {
    Write-Host "Some formatting issues could not be automatically fixed. Please check the output above." -ForegroundColor Yellow
} 
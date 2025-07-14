# Fix indentation issues in specific files
Write-Host "Fixing indentation issues..."

# Create a temporary file for each problematic file
$files = @(
    "src/lib/init-config-widget.js",
    "src/main/credential-fill.js"
)

foreach ($file in $files) {
    Write-Host "Processing $file..."
    
    # Read the file content
    $content = Get-Content $file -Raw
    
    # Replace spaces with tabs at the beginning of each line
    $lines = $content -split "`n"
    $newLines = @()
    
    foreach ($line in $lines) {
        if ($line -match "^\s+") {
            # Count leading spaces
            $spaces = $line -replace "^(\s+).*", '$1'
            $spaceCount = $spaces.Length
            
            # Convert to tabs (assuming 2 spaces = 1 tab)
            $tabCount = [Math]::Ceiling($spaceCount / 2)
            $tabs = "`t" * $tabCount
            
            # Replace spaces with tabs
            $newLine = $line -replace "^\s+", $tabs
            $newLines += $newLine
        } else {
            $newLines += $line
        }
    }
    
    # Write back to file
    $newLines -join "`n" | Set-Content $file
}

Write-Host "Indentation fixes completed. Running lint check..."
npm run lint 
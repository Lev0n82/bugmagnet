# Fix tab indentation issues
Write-Host "Fixing tab indentation issues..."

# Function to fix indentation in a file
function Fix-FileIndentation {
    param (
        [string]$FilePath
    )
    
    Write-Host "Processing $FilePath..."
    
    # Read the file content
    $content = Get-Content $FilePath -Raw
    
    # Split into lines
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
    $newLines -join "`n" | Set-Content $FilePath -NoNewline
}

# Process the problematic files
$files = @(
    "src/lib/init-config-widget.js",
    "src/main/credential-fill.js"
)

foreach ($file in $files) {
    Fix-FileIndentation -FilePath $file
}

Write-Host "Indentation fixes completed. Running lint check..."
npm run lint 
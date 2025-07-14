
$ErrorActionPreference = 'Stop'

# 1. Version bump (patch)
$packageJsonPath = Join-Path $PSScriptRoot 'package.json'
$packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
$currentVersion = $packageJson.version
$versionParts = $currentVersion.Split('.')
$versionParts[-1] = [int]$versionParts[-1] + 1
$newVersion = $versionParts -join '.'
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
Write-Host "Version bumped: $currentVersion -> $newVersion"

# 2. Compile release notes
$releaseFolder = Join-Path $PSScriptRoot 'release'
$buildFolder = Join-Path $releaseFolder 'build'
if (!(Test-Path $releaseFolder)) { New-Item -ItemType Directory -Path $releaseFolder | Out-Null }
if (!(Test-Path $buildFolder)) { New-Item -ItemType Directory -Path $buildFolder | Out-Null }

# Get last version tag (if any)
$lastTag = git tag --sort=-creatordate | Select-Object -Last 1
if ($lastTag) {
    $releaseNotes = git log $lastTag..HEAD --pretty=format:"%h %s" | Out-String
} else {
    $releaseNotes = git log --pretty=format:"%h %s" | Out-String
}
$releaseNotesPath = Join-Path $releaseFolder "release-notes-$newVersion.txt"
Set-Content -Path $releaseNotesPath -Value $releaseNotes
Write-Host "Release notes written to $releaseNotesPath"

# 3. Build and package
npm run install-deps
npm run pack-extension

# 4. Move zip to release/build subfolder
$zipPath = Join-Path $PSScriptRoot 'bugmagnet-extension.zip'
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}
Compress-Archive -Path "$PSScriptRoot\pack\*" -DestinationPath $zipPath
Write-Host "Created $zipPath"
$targetZip = Join-Path $buildFolder "bugmagnet-extension-$newVersion.zip"
Move-Item -Path $zipPath -Destination $targetZip -Force
Write-Host "Moved package to $targetZip"

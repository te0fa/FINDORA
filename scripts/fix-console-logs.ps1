# fix-console-logs.ps1
# Replaces all console.log/warn/error in DAL & lib files with structured logger calls.
# Run from the FINDORA root: powershell -File scripts/fix-console-logs.ps1

$ErrorActionPreference = "Stop"
$root = "e:\FINDORA\src"
$loggerImport = "import { createLogger } from '@/lib/utils/logger'"

$files = Get-ChildItem -Path $root -Recurse -Include "*.ts" -Exclude "*.d.ts" |
         Where-Object {
           $_.FullName -notmatch "node_modules" -and
           $_.FullName -notmatch "\.next" -and
           $_.FullName -notmatch "logger\.ts" -and          # skip the logger itself
           $_.FullName -notmatch "error-handler\.ts"        # skip error handler
         }

$fixed = 0
$skipped = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $changed = $false

    # Only process files that actually have console calls
    if ($content -notmatch "console\.(log|warn|error|info|debug)") {
        $skipped++
        continue
    }

    $relPath = $file.FullName.Replace("e:\FINDORA\src\", "")
    Write-Host "Processing: $relPath" -ForegroundColor Cyan

    # 1. Add logger import if not already there
    if ($content -notmatch "createLogger|from '@/lib/utils/logger'") {
        # Add after the last import block
        $content = $content -replace "(import .+\n)(?!import)", "`$1$loggerImport`nconst log = createLogger('$(($file.BaseName))')`n`n"
        $changed = $true
    }

    # 2. Replace console.log -> log.info (with string templates preserved)
    $newContent = $content -replace "console\.log\((`'[^`']*`'|`"[^`"]*`"|``[^``]*``)\)", "log.info(`$1)"
    $newContent = $newContent -replace "console\.log\((`'[^`']*`'|`"[^`"]*`"|``[^``]*``),\s*([^)]+)\)", "log.info(`$1, { data: `$2 })"
    $newContent = $newContent -replace "console\.log\((.+?)\)", "log.debug(`$1)"

    # 3. Replace console.warn -> log.warn
    $newContent = $newContent -replace "console\.warn\((`'[^`']*`'|`"[^`"]*`"|``[^``]*``)\)", "log.warn(`$1)"
    $newContent = $newContent -replace "console\.warn\((.+?)\)", "log.warn(`$1)"

    # 4. Replace console.error -> log.error
    $newContent = $newContent -replace "console\.error\((`'[^`']*`'|`"[^`"]*`"|``[^``]*``)\)", "log.error(`$1)"
    $newContent = $newContent -replace "console\.error\((.+?)\)", "log.error(`$1)"

    if ($newContent -ne $content) {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        $changed = $true
    }

    if ($changed) {
        $fixed++
        Write-Host "  ✅ Fixed" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "Fixed:   $fixed files" -ForegroundColor Green
Write-Host "Skipped: $skipped files (no console calls)" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

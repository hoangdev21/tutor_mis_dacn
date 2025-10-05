# Script to add TokenManager to all HTML dashboard pages
# Run this in PowerShell from the tutornis root directory

$ErrorActionPreference = "Stop"

Write-Host "🔧 Adding TokenManager to all dashboard pages..." -ForegroundColor Cyan

# Define paths
$pages = @(
    # Student pages
    "frontend\pages\student\dashboard.html",
    "frontend\pages\student\find_tutor.html",
    "frontend\pages\student\tutor_request.html",
    "frontend\pages\student\profile_student.html",
    "frontend\pages\student\settings.html",
    "frontend\pages\student\blog.html",
    "frontend\pages\student\booking_requests.html",
    
    # Tutor pages
    "frontend\pages\tutor\dashboard.html",
    "frontend\pages\tutor\new_request.html",
    "frontend\pages\tutor\schedule.html",
    "frontend\pages\tutor\profile_tutor.html",
    "frontend\pages\tutor\settings.html",
    "frontend\pages\tutor\blog.html",
    "frontend\pages\tutor\student_management.html",
    "frontend\pages\tutor\income.html",
    "frontend\pages\tutor\booking_requests.html",
    
    # Admin pages
    "frontend\pages\admin\dashboard.html",
    "frontend\pages\admin\user.html",
    "frontend\pages\admin\approve.html",
    "frontend\pages\admin\blog_management.html",
    "frontend\pages\admin\financial_statistics.html",
    "frontend\pages\admin\transaction.html",
    "frontend\pages\admin\report.html",
    "frontend\pages\admin\logs.html",
    "frontend\pages\admin\course.html"
)

$tokenManagerScript = '<script src="../../assets/js/token-manager.js"></script>'
$dashboardCommonScript = '<script src="../../assets/js/dashboard-common.js"></script>'

$updatedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot $page
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  File not found: $page" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    try {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Check if TokenManager is already added
        if ($content -like "*token-manager.js*") {
            Write-Host "✓ Already has TokenManager: $page" -ForegroundColor Green
            $skippedCount++
            continue
        }
        
        # Find the dashboard-common.js script tag
        if ($content -match "(?m)^(\s*)<script src=`"../../assets/js/dashboard-common\.js`"></script>") {
            $indent = $Matches[1]
            $replacement = "$indent$tokenManagerScript`r`n$indent$dashboardCommonScript"
            $newContent = $content -replace "(?m)^(\s*)<script src=`"../../assets/js/dashboard-common\.js`"></script>", $replacement
            
            # Save the file
            $newContent | Set-Content $filePath -Encoding UTF8 -NoNewline
            
            Write-Host "✅ Updated: $page" -ForegroundColor Green
            $updatedCount++
        } else {
            Write-Host "⚠️  dashboard-common.js not found in: $page" -ForegroundColor Yellow
            $errorCount++
        }
        
    } catch {
        Write-Host "❌ Error processing $page : $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Updated: $updatedCount files" -ForegroundColor Green
Write-Host "   ⚠️  Skipped: $skippedCount files (already has TokenManager)" -ForegroundColor Yellow
Write-Host "   ❌ Errors: $errorCount files" -ForegroundColor Red

if ($updatedCount -gt 0) {
    Write-Host "`n🎉 TokenManager successfully added to $updatedCount pages!" -ForegroundColor Green
    Write-Host "   Users will now have automatic token refresh!" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  No files were updated. Check the errors above." -ForegroundColor Yellow
}

Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test login on all roles (Student, Tutor, Admin)" -ForegroundColor White
Write-Host "   2. Check browser console for TokenManager initialization" -ForegroundColor White
Write-Host "   3. Wait for token to expire and verify auto-refresh" -ForegroundColor White
Write-Host "   4. Test concurrent API requests" -ForegroundColor White

# Test Runner Script for Booking Flow
# Usage: .\run-tests.ps1 -Token "your_token_here"

param(
    [string]$Token = "",
    [switch]$ApiOnly,
    [switch]$FlowOnly,
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "TEST RUNNER - Booking Flow Tests" -ForegroundColor Cyan
    Write-Host "============================================================`n" -ForegroundColor Cyan
    
    Write-Host "Usage:"
    Write-Host '  .\run-tests.ps1 -Token "your_jwt_token"'
    Write-Host '  .\run-tests.ps1 -Token "token" -ApiOnly    # Run API tests only'
    Write-Host '  .\run-tests.ps1 -Token "token" -FlowOnly   # Run integration test only'
    Write-Host "`nExamples:"
    Write-Host '  .\run-tests.ps1 -Token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."'
    Write-Host "`nHow to get token:"
    Write-Host "  1. Login to frontend as student"
    Write-Host "  2. Open DevTools (F12) -> Console"
    Write-Host "  3. Run: localStorage.getItem('token')"
    Write-Host "  4. Copy the token value`n"
    exit 0
}

Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "BOOKING FLOW TEST RUNNER" -ForegroundColor Magenta
Write-Host "============================================================`n" -ForegroundColor Magenta

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "Backend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory" -ForegroundColor Cyan
    exit 1
}

# Check if server is running
Write-Host "Checking if backend server is running..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api" -ErrorAction Stop -TimeoutSec 5
    Write-Host "Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the server first:" -ForegroundColor Yellow
    Write-Host "  cd backend"
    Write-Host "  npm start"
    exit 1
}

# Check token
if ($Token -eq "") {
    Write-Host "No token provided!" -ForegroundColor Yellow
    Write-Host "Tests will run with limited functionality" -ForegroundColor Cyan
    Write-Host "To run full tests, provide token:" -ForegroundColor Cyan
    Write-Host '  .\run-tests.ps1 -Token "your_token_here"'
    Write-Host ""
    $continue = Read-Host "Press Enter to continue with limited tests or Ctrl+C to exit"
} else {
    $tokenLength = $Token.Length
    Write-Host "Token provided ($tokenLength characters)" -ForegroundColor Green
    $env:STUDENT_TOKEN = $Token
}

# Navigate to backend
Set-Location backend

# Initialize result variables
$apiResult = 0
$flowResult = 0

# Run API tests
if (-not $FlowOnly) {
    Write-Host "`n============================================================" -ForegroundColor Magenta
    Write-Host "Running API Tests" -ForegroundColor Magenta
    Write-Host "============================================================`n" -ForegroundColor Magenta
    
    node tests/test-booking-api.js
    $apiResult = $LASTEXITCODE
    Write-Host ""
}

# Run integration tests
if (-not $ApiOnly) {
    Write-Host "`n============================================================" -ForegroundColor Magenta
    Write-Host "Running Integration Tests" -ForegroundColor Magenta
    Write-Host "============================================================`n" -ForegroundColor Magenta
    
    node tests/test-booking-flow.js
    $flowResult = $LASTEXITCODE
    Write-Host ""
}

# Go back to root
Set-Location ..

# Summary
Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "TEST SUMMARY" -ForegroundColor Magenta
Write-Host "============================================================`n" -ForegroundColor Magenta

if (-not $FlowOnly) {
    if ($apiResult -eq 0) {
        Write-Host "API Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "API Tests: FAILED" -ForegroundColor Red
    }
}

if (-not $ApiOnly) {
    if ($flowResult -eq 0) {
        Write-Host "Integration Tests: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Integration Tests: FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Frontend tests:" -ForegroundColor Cyan
Write-Host "  Open: frontend/tests/test-navigation-flow.html in browser"
Write-Host ""

# Exit with appropriate code
if (($apiResult -ne 0) -or ($flowResult -ne 0)) {
    exit 1
}

exit 0

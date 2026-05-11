param(
    [switch]$SkipInstall = $false
)

Write-Host "🚀 SLEEKBLUE STICKER PLATFORM LAUNCH ORCHESTRATOR 🚀" -ForegroundColor Cyan
Write-Host "=========================================================="

# 1. Environment Verification
Write-Host "`n[1/5] Verifying Environment Secrets..." -ForegroundColor Yellow

$apiServerDir = "artifacts/api-server"
$envFile = "$apiServerDir/.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: $envFile is missing." -ForegroundColor Red
    Write-Host "Please copy .env.example to $apiServerDir/.env and fill in your keys." -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile -Raw
if ($envContent -notmatch "DATABASE_URL\s*=\s*.+") {
    Write-Host "❌ Error: DATABASE_URL is missing or empty in .env" -ForegroundColor Red
    exit 1
}
if ($envContent -match "PAYSTACK_PUBLIC_KEY\s*=\s*pk_test_REPLACE_WITH_YOUR_KEY") {
    Write-Host "❌ Error: PAYSTACK_PUBLIC_KEY is still the placeholder. You cannot process sales." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment verified." -ForegroundColor Green

# 2. Dependency Installation
if (-not $SkipInstall) {
    Write-Host "`n[2/5] Installing Dependencies across Monorepo..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "`n[2/5] Skipping Dependency Installation..." -ForegroundColor DarkGray
}

# 3. Database Seeding
Write-Host "`n[3/5] Synchronizing and Seeding Database..." -ForegroundColor Yellow
Push-Location $apiServerDir
pnpm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to seed database. Check your Neon connection string." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ Database seeded with default sticker products." -ForegroundColor Green

# 4. Starting API Server
Write-Host "`n[4/5] Booting API Server (Port 8080)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "run", "dev" -WorkingDirectory $apiServerDir
Start-Sleep -Seconds 3

# 5. Starting Storefront
Write-Host "`n[5/5] Booting Storefront (Port 3000)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "run", "dev" -WorkingDirectory "artifacts/storefront"

Write-Host "`n=========================================================="
Write-Host "🎉 ALL SYSTEMS GO! The Sleekblue Sales Machine is LIVE." -ForegroundColor Green
Write-Host "API Server: http://localhost:8080"
Write-Host "Storefront: http://localhost:3000"
Write-Host "=========================================================="
Write-Host "`nTo process your first live sale immediately:"
Write-Host "1. Go to http://localhost:3000"
Write-Host "2. Click 'Quick Order' or the Chat Bubble."
Write-Host "3. Checkout using your Paystack credentials."
Write-Host "4. Complete the WhatsApp handoff."

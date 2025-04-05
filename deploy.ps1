# Deployment script for Figma to Sitecore Converter

Write-Host "Deploying Figma to Sitecore Converter to Vercel..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "Vercel CLI version: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "Vercel CLI is not installed. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install Vercel CLI." -ForegroundColor Red
        exit 1
    }
}

# Check if user is logged in to Vercel
Write-Host "Checking Vercel login status..." -ForegroundColor Yellow
$vercelLoginCheck = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0 -or $vercelLoginCheck -like "*Error:*") {
    Write-Host "Not logged in to Vercel. Starting login process..." -ForegroundColor Yellow
    Write-Host "Please follow the instructions in your browser to complete the login." -ForegroundColor Yellow
    vercel login
    
    # Verify login was successful
    $vercelLoginVerify = vercel whoami 2>&1
    if ($LASTEXITCODE -ne 0 -or $vercelLoginVerify -like "*Error:*") {
        Write-Host "Error: Failed to log in to Vercel." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "Successfully logged in to Vercel as: $vercelLoginVerify" -ForegroundColor Green
    }
} else {
    Write-Host "Already logged in to Vercel as: $vercelLoginCheck" -ForegroundColor Green
}

# Check if .env.local exists
if (-not (Test-Path .env.local)) {
    Write-Host ".env.local file not found. Creating template..." -ForegroundColor Yellow
    "OPENAI_API_KEY=your_api_key_here" | Out-File -FilePath .env.local
    Write-Host "Please update .env.local with your OpenAI API key before deploying." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path node_modules)) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

# Create vercel.json if it doesn't exist
if (-not (Test-Path vercel.json)) {
    Write-Host "Creating vercel.json configuration..." -ForegroundColor Yellow
    @"
{
  "version": 2,
  "public": true,
  "github": {
    "enabled": true,
    "silent": true
  }
}
"@ | Out-File -FilePath vercel.json
    Write-Host "Created vercel.json with public visibility setting." -ForegroundColor Green
}

# Build the project
Write-Host "Building the project..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed." -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Green
vercel --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Don't forget to set your OPENAI_API_KEY environment variable in the Vercel dashboard." -ForegroundColor Yellow
Write-Host "Your application should now be live at the URL provided by Vercel." -ForegroundColor Green
Write-Host "To make your project fully public:" -ForegroundColor Yellow
Write-Host "1. Go to https://vercel.com/dashboard" -ForegroundColor Yellow
Write-Host "2. Select your project 'hackathon-codegen-app'" -ForegroundColor Yellow
Write-Host "3. Go to 'Settings' > 'General'" -ForegroundColor Yellow
Write-Host "4. Scroll down to 'Project Visibility'" -ForegroundColor Yellow
Write-Host "5. Change it from 'Private' to 'Public'" -ForegroundColor Yellow

Read-Host -Prompt "Press Enter to exit" 
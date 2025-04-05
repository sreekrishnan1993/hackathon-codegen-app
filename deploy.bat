@echo off
setlocal enabledelayedexpansion

echo Deploying Figma to Sitecore Converter to Vercel...

REM Check if Node.js is installed
node --version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo Error: npm is not installed. Please install npm first.
    exit /b 1
)

REM Check if Vercel CLI is installed
call vercel --version >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo Vercel CLI is not installed. Installing...
    call npm install -g vercel
    if !ERRORLEVEL! neq 0 (
        echo Error: Failed to install Vercel CLI.
        exit /b 1
    )
)

REM Check if user is logged in to Vercel
call vercel whoami >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo Not logged in to Vercel. Please log in:
    call vercel login
    if !ERRORLEVEL! neq 0 (
        echo Error: Failed to log in to Vercel.
        exit /b 1
    )
)

REM Check if .env.local exists
if not exist .env.local (
    echo .env.local file not found. Creating template...
    echo OPENAI_API_KEY=your_api_key_here> .env.local
    echo Please update .env.local with your OpenAI API key before deploying.
    timeout /t 5
)

REM Build the project
echo Building the project...
call npm run build
if !ERRORLEVEL! neq 0 (
    echo Error: Build failed.
    exit /b 1
)

REM Deploy to Vercel
echo Deploying to Vercel...
call vercel --prod
if !ERRORLEVEL! neq 0 (
    echo Error: Deployment failed.
    exit /b 1
)

echo Deployment complete!
echo Don't forget to set your OPENAI_API_KEY environment variable in the Vercel dashboard.
echo Your application should now be live at the URL provided by Vercel.

pause 
#!/bin/bash

# Figma to Sitecore Converter Deployment Script
echo "🚀 Deploying Figma to Sitecore Converter to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Vercel. Please log in:"
    vercel login
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Creating template..."
    echo "OPENAI_API_KEY=your_api_key_here" > .env.local
    echo "⚠️ Please update .env.local with your OpenAI API key before deploying."
fi

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔑 Don't forget to set your OPENAI_API_KEY environment variable in the Vercel dashboard."
echo "🌐 Your application should now be live at the URL provided by Vercel." 
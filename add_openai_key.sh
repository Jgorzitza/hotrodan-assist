#!/bin/bash

echo "=== OPENAI API KEY ADDITION ==="
echo ""
echo "This script will securely add your OpenAI API key to both .env files"
echo ""
echo "Security: The key will not be displayed or logged"
echo ""

# Prompt for the API key
read -s -p "Paste your OpenAI API key (starts with sk-): " OPENAI_KEY
echo ""

# Validate the key format
if [[ $OPENAI_KEY =~ ^sk- ]]; then
    echo "✅ Valid API key format detected"
    
    # Add to main .env file
    sed -i "s/OPENAI_API_KEY=/OPENAI_API_KEY=$OPENAI_KEY/" .env
    echo "✅ Added to main .env file"
    
    # Add to dashboard .env file
    echo "OPENAI_API_KEY=$OPENAI_KEY" >> dashboard/.env
    echo "✅ Added to dashboard .env file"
    
    echo ""
    echo "🎉 OpenAI API key added successfully!"
    echo ""
    echo "Verification (showing only first 8 characters for security):"
    echo "Main .env: OPENAI_API_KEY=${OPENAI_KEY:0:8}..."
    echo "Dashboard .env: OPENAI_API_KEY=${OPENAI_KEY:0:8}..."
    
else
    echo "❌ Invalid API key format. Key must start with 'sk-'"
    echo "Please run the script again with a valid key"
    exit 1
fi

echo ""
echo "✅ OpenAI API key setup complete!"

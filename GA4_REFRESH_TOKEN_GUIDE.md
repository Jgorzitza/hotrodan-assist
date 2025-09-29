# GA4 Refresh Token Setup Guide

## Overview
To get GA4 credentials, you need to go through Google's OAuth 2.0 authorization flow. This guide will walk you through the process step by step.

## Prerequisites
- Google Analytics 4 property set up
- Google Cloud Console access
- Admin access to your GA4 property

## Step 1: Create Google Cloud Project & Enable APIs

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 1.2 Create or Select Project
- Click "Select a project" → "New Project"
- Name: "GA4 Analytics Integration" (or similar)
- Click "Create"

### 1.3 Enable Required APIs
- Go to "APIs & Services" → "Library"
- Search and enable:
  - **Google Analytics Reporting API**
  - **Google Analytics Data API**
  - **Google Analytics Admin API**

## Step 2: Create OAuth 2.0 Credentials

### 2.1 Go to Credentials
- Navigate to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client IDs"

### 2.2 Configure OAuth Consent Screen
- If prompted, configure OAuth consent screen:
  - User Type: External (unless you have Google Workspace)
  - App name: "GA4 Analytics Integration"
  - User support email: Your email
  - Developer contact: Your email
  - Add scopes: `https://www.googleapis.com/auth/analytics.readonly`

### 2.3 Create OAuth Client
- Application type: "Web application"
- Name: "GA4 Web Client"
- Authorized redirect URIs: `https://developers.google.com/oauthplayground`
- Click "Create"

### 2.4 Save Credentials
- Copy the **Client ID** and **Client Secret**
- You'll need these for the next step

## Step 3: Get Refresh Token Using OAuth Playground

### 3.1 Go to OAuth 2.0 Playground
- Visit: https://developers.google.com/oauthplayground/

### 3.2 Configure Playground
- Click the gear icon (⚙️) in top right
- Check "Use your own OAuth credentials"
- Enter your **Client ID** and **Client Secret**
- Click "Close"

### 3.3 Select Scopes
- In left panel, find "Google Analytics Reporting API v4"
- Select: `https://www.googleapis.com/auth/analytics.readonly`
- Click "Authorize APIs"

### 3.4 Authorize Application
- Sign in with your Google account
- Grant permissions to your application
- You'll be redirected back to playground

### 3.5 Exchange for Tokens
- Click "Exchange authorization code for tokens"
- You'll get:
  - **Access Token** (expires in 1 hour)
  - **Refresh Token** (doesn't expire, keep this!)

## Step 4: Get GA4 Property ID

### 4.1 Go to Google Analytics
- Visit: https://analytics.google.com/
- Select your GA4 property

### 4.2 Find Property ID
- Go to "Admin" (gear icon)
- Under "Property" column, click "Property Details"
- Copy the **Property ID** (numeric, like 123456789)

## Step 5: Test Your Credentials

### 5.1 Use the Refresh Token
- The refresh token you got from OAuth Playground is what you need
- It will be used to get new access tokens automatically

### 5.2 Verify Access
- Test that your credentials work with GA4 API
- The refresh token should allow long-term access

## Important Notes

### Security
- **Never share your refresh token publicly**
- Store it securely in environment variables
- The refresh token doesn't expire but can be revoked

### Scopes Used
- `https://www.googleapis.com/auth/analytics.readonly` - Read-only access to GA4 data

### Troubleshooting
- If refresh token doesn't work, re-authorize through OAuth Playground
- Make sure your GA4 property has data
- Verify the property ID is correct

## Quick Reference

After completing these steps, you'll have:
- **GA4_PROPERTY_ID**: From GA4 Admin → Property Details
- **GA4_CLIENT_ID**: From Google Cloud Console → Credentials
- **GA4_CLIENT_SECRET**: From Google Cloud Console → Credentials  
- **GA4_REFRESH_TOKEN**: From OAuth 2.0 Playground

## Next Steps
Once you have all four values, run:
```bash
./add_ga4_credentials.sh
```

And enter each value when prompted.

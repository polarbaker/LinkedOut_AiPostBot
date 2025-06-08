# Deploying Enhanced LinkedIn Generator to Render

This guide walks you through deploying your Enhanced LinkedIn Generator application to Render.

## Prerequisites

- A [Render account](https://render.com/) (free tier available)
- Your application code in a Git repository (GitHub, GitLab, or BitBucket)
- API keys for OpenAI and/or Google Gemini (if not using mock mode)

## Deployment Steps

### 1. Push Your Code to a Git Repository

Make sure your application code is in a Git repository. If you haven't done so already:

```bash
git init
git add .
git commit -m "Initial commit for deployment"
git remote add origin <your-repository-url>
git push -u origin main
```

### 2. Create a New Web Service on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click **New** and select **Web Service**
3. Connect your Git repository
4. Configure the service:
   - **Name**: enhanced-linkedin-generator (or your preferred name)
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

### 3. Configure Environment Variables

In the Render Dashboard, add the following environment variables:

#### For Production with Real API Keys:
- `MOCK_MODE`: false
- `LLM_PROVIDER`: gemini (or openai)
- `GEMINI_API_KEY`: Your Gemini API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: 10000 (Render will override this internally)

#### For Testing Deployment:
- `MOCK_MODE`: true
- `LLM_PROVIDER`: mock
- `PORT`: 10000

### 4. Deploy the Service

1. Click **Create Web Service**
2. Wait for the deployment to complete
3. Once deployed, your application will be available at the URL provided by Render

## Automatic Deployments

For automatic deployments when you push code to your repository:

1. In your Render Dashboard, go to your web service
2. Navigate to **Settings**
3. Under **Build & Deploy**, ensure **Auto-Deploy** is enabled

## Monitoring and Logs

1. In your Render Dashboard, go to your web service
2. Click on **Logs** to view application logs
3. Use the **/health** endpoint to check your application status

## Testing Your Deployment

After deployment, visit the following endpoints to ensure everything is working:

1. **Health Check**: `https://your-app-url.onrender.com/health`
2. **Main Application**: `https://your-app-url.onrender.com/`

## Troubleshooting

If you encounter issues:

1. Check the logs in your Render Dashboard
2. Verify your environment variables are set correctly
3. Make sure all dependencies are in your requirements.txt file
4. Try redeploying with `MOCK_MODE=true` to test without API dependencies

## Scaling and Paid Plans

The free tier of Render has some limitations:
- Services spin down after periods of inactivity
- Limited compute resources

For production use, consider upgrading to a paid plan for:
- Always-on services
- More compute resources
- Custom domains
- Higher bandwidth allowances

# AI Suggestions Not Working with Ngrok - Troubleshooting Guide

## Problem
AI chat suggestions work on localhost but not when using ngrok tunnels.

## Root Cause
The backend service running through ngrok cannot reach the LLM service running on localhost:8000.

## Solutions

### Option 1: Run LLM Service Locally (Recommended)
This is the simplest solution if you're only testing the frontend through ngrok.

1. **Keep LLM service running locally:**
   ```bash
   cd drawsy-llm
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Ensure backend can reach localhost:**
   - Backend config should have: `LLM_SERVICE_URL=http://localhost:8000`
   - This works if your backend is running on the same machine

### Option 2: Create Ngrok Tunnel for LLM Service
If you need the LLM service accessible externally:

1. **Start ngrok tunnel for LLM service:**
   ```bash
   ngrok http 8000
   ```

2. **Update backend configuration:**
   ```bash
   # In drawsy-backend/.env.ngrok, replace:
   LLM_SERVICE_URL=http://localhost:8000
   # With your actual ngrok URL:
   LLM_SERVICE_URL=https://your-llm-ngrok-url.ngrok-free.app
   ```

3. **Restart backend service**

### Option 3: Use the Helper Scripts
Use the provided scripts to manage multiple ngrok tunnels:

1. **Start all tunnels:**
   ```bash
   chmod +x start-ngrok-tunnels.sh
   ./start-ngrok-tunnels.sh
   ```

2. **Check tunnel URLs:**
   ```bash
   # Visit ngrok dashboard
   open http://localhost:4040
   
   # Or check logs
   tail -f ngrok-backend.log
   tail -f ngrok-llm.log
   ```

3. **Update environment files with actual URLs**

4. **Stop tunnels when done:**
   ```bash
   ./stop-ngrok-tunnels.sh
   ```

## Verification Steps

### 1. Check LLM Service Accessibility
Test if the backend can reach the LLM service:

```bash
# From your backend machine, test LLM service
curl -X POST http://localhost:8000/generate-chat-suggestions \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "count": 3, "moods": ["encouraging", "curious", "playful"]}'
```

### 2. Check Backend Logs
Look for LLM service connection errors:
```bash
cd drawsy-backend
npm run start:dev
# Look for messages like "Failed to generate chat suggestions" or "ECONNREFUSED"
```

### 3. Test in Browser
1. Open browser console
2. Send a chat message
3. Check if AI suggestions appear
4. Look for any network errors in DevTools

## Common Issues & Solutions

### Issue: "ECONNREFUSED" Error
**Cause:** LLM service is not running or not accessible
**Solution:** 
- Make sure LLM service is running: `cd drawsy-llm && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Check if port 8000 is accessible

### Issue: "Timeout" Error
**Cause:** LLM service is slow to respond
**Solution:** 
- Check if OpenRouter API key is configured
- LLM service will use fallback responses if OpenRouter fails

### Issue: Empty Suggestions Array
**Cause:** LLM service returns empty response
**Solution:** 
- Check LLM service logs for errors
- Backend now includes fallback suggestions

## Environment Configuration

### Backend (.env.ngrok)
```env
# For local LLM service
LLM_SERVICE_URL=http://localhost:8000

# For ngrok LLM service (replace with your URL)
# LLM_SERVICE_URL=https://your-llm-ngrok-url.ngrok-free.app
```

### LLM Service (.env or .env.ngrok)
```env
# OpenRouter API key (optional but recommended)
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp

PORT=8000
HOST=0.0.0.0
```

## Testing Commands

### Test LLM Service Directly
```bash
curl -X POST http://localhost:8000/health
curl -X POST http://localhost:8000/generate-chat-suggestions \
  -H "Content-Type: application/json" \
  -d '{"message": "nice drawing", "count": 3}'
```

### Test Through Ngrok
```bash
curl -X POST https://your-llm-ngrok-url.ngrok-free.app/health \
  -H "ngrok-skip-browser-warning: true"
```

## Quick Fix
If you just want to get it working quickly:

1. Make sure LLM service is running locally on port 8000
2. Keep `LLM_SERVICE_URL=http://localhost:8000` in backend config
3. Only use ngrok for the frontend and backend, not the LLM service

This should work as long as your backend can reach localhost:8000.
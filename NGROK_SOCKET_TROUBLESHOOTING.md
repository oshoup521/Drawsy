# Ngrok Socket Connection Troubleshooting Guide

## Current Issues Identified
- Socket connections failing when using ngrok tunnels
- "Disconnected" status in the application
- Connection health showing failures

## Changes Made

### 1. Backend WebSocket Gateway Configuration
- Updated CORS to specifically allow ngrok domains
- Added regex patterns for ngrok URLs
- Increased ping timeout and interval for better stability
- Added proper transport configuration

### 2. Frontend Socket Service
- Changed transport order to try polling first (more reliable with ngrok)
- Increased connection timeout from 10s to 20s
- Added better debugging and logging
- Enhanced error handling

### 3. Debug Tools Added
- `SocketDebugger` utility for detailed logging
- `socket-test.ts` for connection testing
- Enhanced environment detection

## Testing Steps

### 1. Check Current Ngrok URLs
Make sure your ngrok URLs in the environment files match your actual tunnels:

```bash
# Check your current ngrok tunnels
ngrok status
```

Update these files if URLs have changed:
- `drawsy-backend/.env.ngrok`
- `drawsy-frontend/.env.ngrok`

### 2. Test Socket Connection
Open browser console and run:
```javascript
testSocket()
```

### 3. Check Network Tab
1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket) or "socket.io"
3. Look for failed connection attempts
4. Check response headers for CORS issues

### 4. Backend Logs
Check your backend console for:
- CORS blocked origins
- Socket connection attempts
- Any error messages

## Common Ngrok Socket Issues & Solutions

### Issue 1: CORS Errors
**Symptoms:** Browser console shows CORS errors
**Solution:** Verify ngrok URLs are correctly configured in CORS settings

### Issue 2: Transport Failures
**Symptoms:** Connection attempts but immediate disconnection
**Solution:** Use polling transport first, then upgrade to websocket

### Issue 3: Timeout Issues
**Symptoms:** Connection attempts timeout
**Solution:** Increase timeout values (done in recent changes)

### Issue 4: Ngrok Headers Missing
**Symptoms:** 403 errors or browser warnings
**Solution:** Ensure `ngrok-skip-browser-warning` header is included

## Verification Commands

### Start Backend with Ngrok Config
```bash
cd drawsy-backend
cp .env.ngrok .env
npm run start:dev
```

### Start Frontend with Ngrok Config
```bash
cd drawsy-frontend
cp .env.ngrok .env
npm start
```

### Test Direct API Connection
```bash
curl -H "ngrok-skip-browser-warning: true" https://intent-knowing-ape.ngrok-free.app/health
```

## Next Steps if Issues Persist

1. **Check Ngrok Plan Limits:** Free ngrok has connection limits
2. **Try Different Transport:** Force websocket-only or polling-only
3. **Verify Firewall/Proxy:** Corporate networks may block websockets
4. **Check Ngrok Configuration:** Ensure proper tunnel setup

## Environment Variables to Verify

### Backend (.env.ngrok)
```
CORS_ORIGINS=http://localhost:3001,https://crack-leading-feline.ngrok-free.app
```

### Frontend (.env.ngrok)
```
REACT_APP_SOCKET_URL=https://intent-knowing-ape.ngrok-free.app
```

## Debug Commands

### Enable Socket.io Debug Mode
Add to frontend:
```javascript
localStorage.debug = 'socket.io-client:socket';
```

### Check Connection Health
```javascript
// In browser console
console.log('Socket connected:', socketService.isConnected());
console.log('Socket ID:', socketService.getSocketId());
```
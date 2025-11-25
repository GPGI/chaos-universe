# Troubleshooting Network Error

If you see this error:
```
TypeError: NetworkError when attempting to fetch resource.
Error spawning star system: TypeError: NetworkError when attempting to fetch resource.
```

## Quick Fix

The backend API is not running. Start it:

### Option 1: Quick Start Script
```bash
bash scripts/start_backend.sh
```

### Option 2: Manual Start
```bash
cd backend
uvicorn app:app --reload
```

### Option 3: Automated Setup (Both Frontend & Backend)
```bash
bash scripts/test_ui_forge.sh
```

## Verify Backend is Running

Check if backend is accessible:
```bash
curl http://localhost:5001/health
```

Should return:
```json
{"status": "healthy"}
```

Or visit in browser:
- http://localhost:5001/health
- http://localhost:5001/docs (API documentation)

## Common Issues

### 1. Backend Not Started

**Symptoms:**
- NetworkError when trying to create star system
- NetworkError when trying to create planet
- Connection refused errors

**Solution:**
Start the backend server (see above)

### 2. Wrong Port

**Symptoms:**
- Backend running but frontend can't connect
- Connection timeout

**Check:**
- Backend should be on port 5001
- Frontend should be on port 8080
- Check `src/lib/api.ts` for API base URL

**Fix:**
Set environment variable:
```bash
export VITE_API_URL=http://localhost:5001
```

Or create `.env` file:
```env
VITE_API_URL=http://localhost:5001
```

### 3. CORS Issues

**Symptoms:**
- NetworkError with CORS in console
- Request blocked by CORS policy

**Solution:**
Backend CORS is already configured to allow all origins in development.
If issues persist, check `backend/app.py` CORS configuration.

### 4. Firewall/Security Software

**Symptoms:**
- Backend runs but frontend can't connect
- Works sometimes but not always

**Solution:**
- Check firewall settings
- Allow localhost:5001
- Temporarily disable antivirus for testing

## Testing

### 1. Check Backend Status
```bash
bash scripts/check_backend.sh
```

### 2. Test API Endpoint
```bash
curl -X POST "http://localhost:5001/celestial-forge/spawn-star-system?mock=true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestSystem",
    "owner_wallet": "0x1234567890123456789012345678901234567890",
    "tribute_percent": 5.0
  }'
```

### 3. Check Frontend Console
Open browser DevTools (F12) → Console:
- Look for API calls
- Check for CORS errors
- Verify request URLs

### 4. Check Network Tab
Browser DevTools → Network tab:
- Filter by "celestial-forge"
- Check request status
- Check request URL (should be http://localhost:5001/...)

## Quick Start Guide

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app:app --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Check Status:**
```bash
bash scripts/check_backend.sh
```

Then open browser:
- Frontend: http://localhost:8080
- Backend API: http://localhost:5001
- API Docs: http://localhost:5001/docs

## Still Having Issues?

1. **Check backend logs** for errors
2. **Check frontend console** for detailed errors
3. **Verify ports** aren't in use:
   ```bash
   lsof -i :5001  # Backend
   lsof -i :8080  # Frontend
   ```
4. **Try different port** if 5001 is taken:
   ```bash
   uvicorn app:app --reload --port 5002
   ```
   Then update `VITE_API_URL=http://localhost:5002`


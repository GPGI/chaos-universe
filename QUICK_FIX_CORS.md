# Quick Fix for CORS Error

If you see this error:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:5001/plots/...
```

## Immediate Fix

**The backend is not running!** Start it with:

```bash
bash scripts/start_backend.sh
```

Or manually:
```bash
cd backend
uvicorn app:app --reload
```

## Quick Start (Both Frontend & Backend)

Use the automated script:
```bash
bash scripts/quick_start.sh
```

This will:
- Check if backend/frontend are running
- Start backend on port 5001
- Start frontend on port 8080
- Wait for services to be ready

## Verify Backend is Running

Check if backend is accessible:
```bash
curl http://localhost:5001/health
```

Should return: `{"status": "healthy"}`

Or visit in browser:
- http://localhost:5001/health
- http://localhost:5001/docs (API documentation)

## CORS Configuration

CORS is already properly configured in `backend/app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

**Note:** The CORS error occurs because the backend isn't running, not because of misconfiguration.

## Common Scenarios

### Scenario 1: Backend Not Started
**Error:** CORS request did not succeed, Status code: (null)

**Solution:**
```bash
cd backend
uvicorn app:app --reload
```

### Scenario 2: Backend Crashed
**Error:** Same CORS error

**Solution:**
1. Check backend logs for errors
2. Restart backend
3. Check if port 5001 is available: `lsof -i :5001`

### Scenario 3: Wrong Port
**Error:** CORS error persists

**Solution:**
Check if backend is on correct port:
```bash
curl http://localhost:5001/health
```

If not, check what's running:
```bash
ps aux | grep uvicorn
lsof -i :5001
```

## Testing

### 1. Test Backend
```bash
curl http://localhost:5001/health
curl http://localhost:5001/
```

### 2. Test Plots Endpoint
```bash
curl http://localhost:5001/plots/0x96ddab023a0e95e61a976b1a2fc98d7ab4901c33
```

### 3. Test CORS from Browser
Open browser console and run:
```javascript
fetch('http://localhost:5001/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Should return: `{status: "healthy"}`

## Auto-Start Script

Create a file `start_all.sh`:
```bash
#!/bin/bash
# Terminal 1
cd backend && uvicorn app:app --reload

# Terminal 2 (in another terminal)
npm run dev
```

## Still Having Issues?

1. **Check backend logs:**
   ```bash
   tail -f /tmp/backend.log  # If using script
   # Or check terminal where uvicorn is running
   ```

2. **Verify ports:**
   ```bash
   lsof -i :5001  # Backend
   lsof -i :8080  # Frontend
   ```

3. **Restart everything:**
   ```bash
   pkill -f uvicorn
   pkill -f vite
   bash scripts/quick_start.sh
   ```


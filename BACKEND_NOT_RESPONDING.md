# Backend Not Responding - Fix Guide

If you see this error:
```
Cross-Origin Request Blocked: CORS request did not succeed. Status code: (null)
```

## Problem
The backend process is running but not responding on port 5001.

## Quick Fix

### Option 1: Automatic Fix (Recommended)
```bash
bash scripts/fix_backend.sh
```

This will:
1. Kill any stuck uvicorn processes
2. Free port 5001
3. Start a fresh backend server

### Option 2: Manual Fix

**Step 1: Kill stuck processes**
```bash
# Kill uvicorn processes
pkill -f "uvicorn app:app"

# If port is still in use
lsof -ti :5001 | xargs kill -9
```

**Step 2: Start backend**
```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 5001
```

### Option 3: Check and Restart

**Check what's running:**
```bash
# Check uvicorn processes
ps aux | grep uvicorn

# Check port 5001
lsof -i :5001
# or
netstat -tuln | grep 5001
```

**Kill and restart:**
```bash
# Kill the process (use the PID from above)
kill <PID>

# Or force kill
pkill -9 -f "uvicorn app:app"

# Start fresh
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 5001
```

## Verify Backend is Working

After starting, test with:
```bash
curl http://localhost:5001/health
```

Should return: `{"status": "healthy"}`

Or visit in browser:
- http://localhost:5001/health
- http://localhost:5001/docs

## Common Causes

1. **Import Error**: Backend crashed during import
   - Check terminal/logs for errors
   - Try: `cd backend && python3 -c "import app"`

2. **Port Conflict**: Another process using port 5001
   - Check: `lsof -i :5001`
   - Kill conflicting process or use different port

3. **Stuck Process**: Old process still running
   - Kill with: `pkill -f "uvicorn app:app"`
   - Restart backend

4. **Virtual Environment Issues**: Wrong Python environment
   - Activate venv: `source backend/venv/bin/activate`
   - Install deps: `pip install -r backend/requirements.txt`

## Prevention

Use the provided scripts:
- `scripts/fix_backend.sh` - Kill and restart
- `scripts/start_backend.sh` - Clean start
- `scripts/quick_start.sh` - Full setup

## Still Not Working?

1. **Check logs** in the terminal where uvicorn is running
2. **Check Python version**: `python3 --version` (should be 3.8+)
3. **Check dependencies**: `cd backend && pip list | grep uvicorn`
4. **Try different port**: `uvicorn app:app --reload --port 5002`
   - Then update frontend: `export VITE_API_URL=http://localhost:5002`


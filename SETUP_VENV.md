# Virtual Environment Setup Guide

## Quick Start

The project uses a Python virtual environment to avoid conflicts with system packages.

### 1. Create Virtual Environment

```bash
cd /home/hades/Videos/octavia-nebula-core-main
python3 -m venv venv
```

### 2. Activate Virtual Environment

**Linux/Mac:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Verify Installation

```bash
# Test document handler
python scripts/manage_documents.py list

# Test Python imports
python -c "from backend.document_handler import DocumentHandler; print('✓ DocumentHandler imported successfully')"
```

## Using the Virtual Environment

**Always activate the virtual environment before running Python scripts:**

```bash
# Activate
source venv/bin/activate

# Your prompt should show (venv)
# Now you can run:
python scripts/manage_documents.py generate pdf --plot-id 42 --owner 0x... --tx-hash 0x...

# Deactivate when done
deactivate
```

## Running the Backend Server

```bash
# Activate venv
source venv/bin/activate

# Start server
cd backend
uvicorn app:app --reload
```

## Troubleshooting

### "python: command not found"
Use `python3` instead:
```bash
python3 -m venv venv
source venv/bin/activate
python --version  # Should work after activation
```

### "externally-managed-environment" error
This means you're trying to install packages system-wide. Always use a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Virtual environment not activating
Make sure you're in the project root:
```bash
cd /home/hades/Videos/octavia-nebula-core-main
source venv/bin/activate
```

## IDE Setup

If using VS Code or another IDE:
1. Select the Python interpreter from `venv/bin/python`
2. The IDE will automatically use the virtual environment


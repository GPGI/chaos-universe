# Testing Scripts

This directory contains test scripts for various components of the project.

## Celestial Forge Tests

### Quick Test (`test_forge_simple.py`)

Fast check to verify basic functionality:

```bash
python scripts/test_forge_simple.py
```

**What it tests:**
- CLI tool detection (Forge, Avalanche CLI)
- Subnet interactor functionality
- API module imports
- Subnet listing

**When to use:** Quick verification that everything is set up correctly.

### Full Test Suite (`test_celestial_forge.py`)

Comprehensive test suite for the Celestial Forge integration:

```bash
python scripts/test_celestial_forge.py
```

**What it tests:**
1. CLI Detection
2. API Tools Status endpoint
3. List Available Subnets
4. Create Star System (subnet)
5. Get Subnet Status
6. Blockchain Describe command
7. Network Status command
8. Key List command

**Requirements:**
- Backend API running (`uvicorn app:app --reload`)
- Avalanche CLI installed
- Forge installed (optional but recommended)

**When to use:** Full integration testing before deployment.

## CLI Detection Tests

### Test CLI Detection (`test_cli_detection.py`)

Tests the CLI detection system:

```bash
python scripts/test_cli_detection.py
```

**What it tests:**
- Forge detection
- Avalanche CLI detection
- Command discovery
- Subnet listing
- Network information

## Other Tests

### Test App (`test_app.py`)

General application tests:

```bash
python scripts/test_app.py
```

### Test Avalanche Commands (`test_avalanche_commands.py`)

Tests specific Avalanche CLI commands:

```bash
python scripts/test_avalanche_commands.py
```

## Running All Tests

You can run all tests sequentially:

```bash
# Quick tests first
python scripts/test_forge_simple.py

# If quick tests pass, run full suite
python scripts/test_celestial_forge.py

# Test CLI detection
python scripts/test_cli_detection.py

# Test specific commands
python scripts/test_avalanche_commands.py
```

## CI/CD Integration

For continuous integration, you can run:

```bash
# Fast feedback
python scripts/test_forge_simple.py && \
python scripts/test_cli_detection.py

# Full test suite (if backend is available)
python scripts/test_celestial_forge.py
```

## Troubleshooting

### Tests Fail with "Backend API not running"

Start the backend:
```bash
cd backend
uvicorn app:app --reload
```

### Tests Fail with "Avalanche CLI not installed"

Install Avalanche CLI:
```bash
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh
```

### Tests Fail with "Forge not found"

Install Forge (Foundry):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Permission Denied

Make scripts executable:
```bash
chmod +x scripts/*.py
```


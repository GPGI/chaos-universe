# Avalanche CLI Commands Integration

This document describes the specific Avalanche CLI commands that are now automatically supported through the CLI detection system.

## Supported Commands

### 1. `avalanche blockchain describe`

Describes a blockchain configuration.

**Python API:**
```python
from backend.subnet_interaction import blockchain_describe, create_subnet_interactor

# Quick function
result = blockchain_describe("ChaosStarNetwork")

# Using interactor
interactor = create_subnet_interactor()
result = interactor.blockchain_describe("ChaosStarNetwork")

if result.get("success"):
    print(result.get("output"))
```

**REST API:**
```bash
GET /cli/blockchain/{blockchain_name}/describe
```

**Example Response:**
```json
{
  "success": true,
  "output": "...",
  "returncode": 0
}
```

### 2. `avalanche network run`

Runs a network (typically starts a subnet network).

**Python API:**
```python
from backend.subnet_interaction import network_run, create_subnet_interactor

# Quick function
result = network_run("ChaosStarNetwork")

# Using interactor with additional args
interactor = create_subnet_interactor("ChaosStarNetwork")
result = interactor.network_run("ChaosStarNetwork", args=["--bootstrap-ids", "..."])
```

**REST API:**
```bash
POST /cli/network/{network_name}/run
```

**Note:** This command may start a long-running process. Ensure proper handling for async execution.

### 3. `avalanche network status`

Shows the status of the currently running network.

**Python API:**
```python
from backend.subnet_interaction import network_status, create_subnet_interactor

# Quick function
result = network_status()

# Using interactor
interactor = create_subnet_interactor()
result = interactor.network_status()

if result.get("success"):
    print(result.get("output"))
```

**REST API:**
```bash
GET /cli/network/status?network_name=ChaosStarNetwork
```

**Note:** This command doesn't accept network name as an argument - it shows the status of the currently running network. The `network_name` parameter is optional and used only for context.

### 4. `avalanche key list`

Lists available keys in Avalanche CLI.

**Python API:**
```python
from backend.subnet_interaction import key_list, create_subnet_interactor

# Quick function (may require interactive input)
result = key_list("ChaosStarNetwork")

# Using interactor
interactor = create_subnet_interactor("ChaosStarNetwork")
result = interactor.key_list("ChaosStarNetwork")

if result.get("success"):
    print(result.get("output"))
else:
    print(f"Error: {result.get('error')}")
    print("Note: This command may require interactive network selection")
```

**REST API:**
```bash
GET /cli/key/list?network_name=ChaosStarNetwork
```

**Note:** This command may require interactive input for network selection in some Avalanche CLI versions. The system will attempt to use non-interactive mode, but may fail if interactive selection is required.

### 5. `avalanche primary describe`

Describes the primary network configuration.

**Python API:**
```python
from backend.subnet_interaction import primary_describe, create_subnet_interactor

# Quick function
result = primary_describe()

# Using interactor with network selection
interactor = create_subnet_interactor()
result = interactor.primary_describe("Local Network")  # or "Cluster"

if result.get("success"):
    print(result.get("output"))
else:
    print(f"Error: {result.get('error')}")
```

**REST API:**
```bash
GET /cli/primary/describe?network=Local Network
```

**Note:** This command may require network selection (Local Network or Cluster). You can provide the network name as a parameter to avoid interactive selection.

**Python API:**
```python
from backend.subnet_interaction import key_list, create_subnet_interactor

# Quick function (may require interactive input)
result = key_list("ChaosStarNetwork")

# Using interactor
interactor = create_subnet_interactor("ChaosStarNetwork")
result = interactor.key_list("ChaosStarNetwork")

if result.get("success"):
    print(result.get("output"))
else:
    print(f"Error: {result.get('error')}")
    print("Note: This command may require interactive network selection")
```

**REST API:**
```bash
GET /cli/key/list?network_name=ChaosStarNetwork
```

**Note:** This command may require interactive input for network selection in some Avalanche CLI versions. The system will attempt to use non-interactive mode, but may fail if interactive selection is required.

## Command Execution Details

### Error Handling

All commands return a dictionary with:
- `success`: Boolean indicating if command succeeded
- `output`: Standard output from the command
- `error`: Error message if command failed (from stderr)
- `returncode`: Process return code

### Timeouts

Default timeouts:
- `blockchain describe`: 10 seconds
- `network run`: 30 seconds
- `network status`: 10 seconds
- `key list`: 10 seconds

### Interactive Commands

Some commands (like `key list`) may require interactive input. The system attempts to:
1. Run the command non-interactively first
2. Try with network name as argument if provided
3. Return a helpful error message if interactive input is required

For commands requiring interactive input, you may need to run them manually:
```bash
avalanche key list
```

## Usage Examples

### Example 1: Check Blockchain Configuration

```python
from backend.subnet_interaction import blockchain_describe

# Describe a blockchain
result = blockchain_describe("ChaosStarNetwork")

if result.get("success"):
    print("Blockchain description:")
    print(result.get("output"))
else:
    print(f"Failed: {result.get('error')}")
```

### Example 2: Check Network Status

```python
from backend.subnet_interaction import network_status

# Get current network status
result = network_status()

if result.get("success"):
    print("Network is running:")
    print(result.get("output"))
else:
    print("No network running or status unavailable")
```

### Example 3: List Keys

```python
from backend.subnet_interaction import key_list

# Try to list keys (may require interactive input)
result = key_list("ChaosStarNetwork")

if result.get("success"):
    print("Available keys:")
    print(result.get("output"))
else:
    print(f"Error: {result.get('error')}")
    if "interactive" in result.get("error", "").lower():
        print("Run 'avalanche key list' manually to select network")
```

### Example 4: Run Network

```python
from backend.subnet_interaction import network_run

# Start a network (this may start a long-running process)
result = network_run("ChaosStarNetwork")

if result.get("success"):
    print("Network started:")
    print(result.get("output"))
else:
    print(f"Failed to start network: {result.get('error')}")
```

## Integration with CLI Detection

All commands automatically:
1. Check if Avalanche CLI is installed
2. Use the CLI detector to execute commands
3. Return structured results
4. Handle errors gracefully

The commands work seamlessly with the CLI detection system - if Avalanche CLI is not installed, appropriate error messages are returned.

## Testing

Test all commands:
```bash
python scripts/test_avalanche_commands.py
```

Test individual commands:
```python
python3 -c "from backend.subnet_interaction import blockchain_describe; print(blockchain_describe('ChaosStarNetwork'))"
```

## Notes

1. **Network Status**: This command doesn't accept arguments - it shows the currently running network's status.

2. **Key List**: May require interactive network selection. If you encounter this, run the command manually to select the network interactively.

3. **Network Run**: This command starts a network process. Ensure proper process management if running in a long-lived service.

4. **Command Discovery**: The system automatically discovers available commands when Avalanche CLI is detected. Use `GET /cli/commands` to see all discovered commands.


# CLI Detection and Auto-Integration

This project now automatically detects Forge and Avalanche CLI installations and uses them to interact with subnets.

## Features

### Automatic CLI Detection
- **Forge Detection**: Automatically detects if Foundry (forge) is installed and available in PATH
- **Avalanche CLI Detection**: Automatically detects if Avalanche CLI is installed and available in PATH
- **Command Discovery**: Automatically discovers available Avalanche CLI commands by parsing help output

### Subnet Interaction
- **Auto-Configuration**: Automatically discovers RPC URLs and private keys from Avalanche CLI configuration
- **Subnet Management**: List, describe, and interact with subnets using detected CLI tools
- **Contract Deployment**: Automatically uses Forge for contract compilation and deployment

## Usage

### Python API

#### CLI Detection

```python
from backend.cli_detector import detect_tools, is_forge_available, is_avalanche_cli_available

# Quick check
if is_forge_available():
    print("Forge is installed!")

if is_avalanche_cli_available():
    print("Avalanche CLI is installed!")

# Get detailed detection results
tools = detect_tools()
print(tools)
```

#### Subnet Interaction

```python
from backend.subnet_interaction import create_subnet_interactor

# Create subnet interactor (auto-discovers config)
interactor = create_subnet_interactor("ChaosStarNetwork")

# Check tools availability
tools = interactor.check_tools()
# {'forge': True, 'avalanche_cli': True}

# Get subnet status
status = interactor.get_status()

# List available subnets
subnets = interactor.list_subnets()

# Compile contracts
result = interactor.compile_contracts(project_root)

# Deploy contracts
result = interactor.deploy_contracts(project_root, script_path)
```

### Command Line

#### Test CLI Detection

```bash
python scripts/test_cli_detection.py
```

This will:
- Detect Forge installation
- Detect Avalanche CLI installation
- Discover available commands
- List available subnets
- Show subnet status

#### Direct Module Execution

```bash
# Test CLI detector
python -m backend.cli_detector

# Test subnet interaction
python -m backend.subnet_interaction
```

### REST API Endpoints

When the backend is running, new endpoints are available:

#### Detect CLI Tools
```bash
GET /cli/detection
```

Returns:
```json
{
  "success": true,
  "tools": {
    "forge": {
      "installed": true,
      "version": "0.2.0",
      "path": "/usr/local/bin/forge"
    },
    "avalanche_cli": {
      "installed": true,
      "version": "1.0.0",
      "path": "/usr/local/bin/avalanche",
      "available_commands": ["subnet list", "subnet deploy", ...]
    }
  }
}
```

#### Get Subnet Status
```bash
GET /cli/subnet?subnet_name=ChaosStarNetwork
```

#### List Subnets
```bash
GET /cli/subnet/list
```

#### Get Subnet Info
```bash
GET /cli/subnet/{subnet_name}/info
```

#### Get Available Commands
```bash
GET /cli/commands
```

#### Deploy Contracts
```bash
POST /cli/subnet/{subnet_name}/deploy
```

## Integration with Existing Code

### Contract Manager

The `ContractManager` class now automatically:
- Checks if Forge is installed before attempting compilation
- Uses the CLI detector for Forge operations
- Provides better error messages when tools are missing

### Auto-Configuration

The system automatically discovers:
1. **RPC URL**: From Avalanche CLI subnet configuration (`~/.avalanche-cli/subnets/<name>/network.json`)
2. **Private Key**: From Avalanche CLI key files (`~/.avalanche-cli/key/`)
3. **Subnet Information**: From Avalanche CLI subnet commands

## Architecture

### Core Modules

1. **`backend/cli_detector.py`**: Core CLI detection and command discovery
   - `CLIDetector`: Main detection class
   - `detect_tools()`: Quick detection function
   - `is_forge_available()`: Forge availability check
   - `is_avalanche_cli_available()`: Avalanche CLI availability check

2. **`backend/subnet_interaction.py`**: Subnet interaction using detected tools
   - `SubnetInteractor`: Main interaction class
   - `create_subnet_interactor()`: Factory function
   - `auto_detect_and_interact()`: Quick status function

3. **`backend/contract_manager.py`**: Updated to use CLI detection
   - Automatic Forge detection
   - Uses CLI detector for all Forge operations

## How It Works

### CLI Detection

1. **Path Detection**: Uses `shutil.which()` to find executables in PATH
2. **Version Checking**: Executes `--version` commands to verify installation
3. **Command Discovery**: Parses `--help` output to discover available commands

### Command Discovery

The system automatically discovers commands by:
1. Parsing `avalanche --help` for top-level commands
2. Parsing `avalanche <command> --help` for subcommands
3. Building a hierarchical command structure

### Configuration Discovery

The system discovers configuration in this order:
1. Environment variables (`VITE_AVALANCHE_RPC`, `PRIVATE_KEY`)
2. Avalanche CLI commands (`avalanche subnet describe`)
3. Avalanche CLI config files (`~/.avalanche-cli/subnets/<name>/`)
4. Key files (`~/.avalanche-cli/key/*.pk`)

## Benefits

1. **Zero Configuration**: Works automatically if CLI tools are installed
2. **Better Error Messages**: Clear messages when tools are missing
3. **Flexible**: Falls back to manual configuration if CLI tools aren't available
4. **Discoverable**: Automatically finds available commands and subnets
5. **Integration**: Seamlessly integrates with existing code

## Requirements

- Python 3.11+
- Forge (Foundry) - Optional but required for contract operations
- Avalanche CLI - Optional but required for subnet operations

## Troubleshooting

### Forge Not Detected

If Forge is installed but not detected:
1. Check if `forge` is in your PATH: `which forge`
2. Verify Forge works: `forge --version`
3. Make sure you're running from the correct environment

### Avalanche CLI Not Detected

If Avalanche CLI is installed but not detected:
1. Check if `avalanche` is in your PATH: `which avalanche`
2. Verify Avalanche CLI works: `avalanche --version`
3. Check if subnet is configured: `avalanche subnet list`

### Commands Not Discovered

If commands aren't being discovered:
1. Run `avalanche --help` manually to see available commands
2. Check if Avalanche CLI version supports the commands you need
3. Commands are discovered dynamically, so they should appear if supported

## Future Enhancements

- Caching of detection results
- Support for additional CLI tools
- Interactive command builder
- Command validation before execution
- Command history and logging


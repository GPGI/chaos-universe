"""
Subnet Interaction Module
Automatically uses detected Forge and Avalanche CLI to interact with subnets
"""
import os
import json
import subprocess
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from web3 import Web3
from eth_account import Account

from cli_detector import get_cli_detector, is_forge_available, is_avalanche_cli_available
from avalanche_key_loader import get_avalanche_cli_home, find_funded_account_key

# Try to import from avalanche-cli module (may not be available)
try:
    from avalanche_cli.cli_utils import get_rpc_from_cli, discover_from_cli
except ImportError:
    # Fallback to using detector or direct methods
    def get_rpc_from_cli(subnet_name: str):
        """Fallback RPC discovery - ALWAYS returns Chaos Star Network RPC"""
        # Always use Chaos Star Network RPC - never use port 9650
        return "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"
    
    def discover_from_cli(subnet_name: str):
        """Fallback discovery"""
        from avalanche_key_loader import find_funded_account_key
        rpc = get_rpc_from_cli(subnet_name)
        key = find_funded_account_key(subnet_name)
        return rpc, key


class SubnetInteractor:
    """Interacts with subnets using automatically detected CLI tools"""
    
    def __init__(self, subnet_name: str = None):
        self.subnet_name = subnet_name or os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
        self.detector = get_cli_detector()
        self.rpc_url: Optional[str] = None
        self.private_key: Optional[str] = None
        self._auto_discover_config()
    
    def _auto_discover_config(self):
        """Automatically discover RPC URL and private key"""
        # Try to get from environment first
        self.rpc_url = os.getenv("VITE_AVALANCHE_RPC") or os.getenv("AVALANCHE_RPC")
        self.private_key = os.getenv("PRIVATE_KEY")
        
        # If not set, try to discover from Avalanche CLI
        if not self.rpc_url or not self.private_key:
            if is_avalanche_cli_available():
                rpc, key = discover_from_cli(self.subnet_name)
                if rpc:
                    self.rpc_url = rpc
                if key:
                    self.private_key = key
            else:
                # Fallback to reading config files directly
                rpc = get_rpc_from_cli(self.subnet_name)
                if rpc:
                    self.rpc_url = rpc
                key = find_funded_account_key(self.subnet_name)
                if key:
                    self.private_key = key
    
    def check_tools(self) -> Dict[str, bool]:
        """Check if required CLI tools are available"""
        return {
            "forge": is_forge_available(),
            "avalanche_cli": is_avalanche_cli_available(),
        }
    
    def list_subnets(self) -> List[Dict[str, Any]]:
        """List available subnets using Avalanche CLI or filesystem"""
        subnets = []
        
        # Try filesystem first (more reliable than interactive CLI)
        try:
            avalanche_home = get_avalanche_cli_home()
            subnets_dir = avalanche_home / "subnets"
            if subnets_dir.exists():
                for subnet_dir in subnets_dir.iterdir():
                    if subnet_dir.is_dir():
                        subnet_name = subnet_dir.name
                        # Check if it has a sidecar.json (indicates a valid subnet)
                        if (subnet_dir / "sidecar.json").exists() or (subnet_dir / "chain.json").exists():
                            subnets.append({
                                "name": subnet_name,
                                "status": "configured"
                            })
        except Exception:
            pass
        
        # If filesystem method found subnets, return them
        if subnets:
            return subnets
        
        # Fallback to CLI command (may be interactive)
        if is_avalanche_cli_available():
            try:
                return self.detector.list_subnets()
            except Exception:
                pass
        
        return []
    
    def get_subnet_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the current subnet"""
        if not is_avalanche_cli_available():
            return None
        
        try:
            return self.detector.get_subnet_info(self.subnet_name)
        except Exception:
            return None
    
    def get_rpc_url(self) -> Optional[str]:
        """Get RPC URL for the subnet"""
        return self.rpc_url
    
    def get_private_key(self) -> Optional[str]:
        """Get private key for the subnet"""
        return self.private_key
    
    def get_web3_instance(self) -> Optional[Web3]:
        """Get Web3 instance connected to the subnet"""
        if not self.rpc_url:
            return None
        
        try:
            w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            if w3.is_connected():
                return w3
        except Exception:
            pass
        
        return None
    
    def get_account(self) -> Optional[Account]:
        """Get account from private key"""
        if not self.private_key:
            return None
        
        try:
            return Account.from_key(self.private_key)
        except Exception:
            return None
    
    def deploy_contracts(
        self, 
        project_root: Path,
        script_path: Path = None
    ) -> Dict[str, Any]:
        """Deploy contracts using Forge"""
        if not is_forge_available():
            return {
                "success": False,
                "error": "Forge is not installed or not in PATH"
            }
        
        if not self.rpc_url or not self.private_key:
            return {
                "success": False,
                "error": "RPC URL or private key not configured"
            }
        
        # Default to deploy_all.s.sol if script_path not provided
        if script_path is None:
            script_path = project_root / "scripts" / "deploy_all.s.sol"
        
        if not script_path.exists():
            return {
                "success": False,
                "error": f"Deployment script not found: {script_path}"
            }
        
        try:
            # Format private key for Forge
            private_key = self.private_key
            if not private_key.startswith("0x"):
                private_key = f"0x{private_key}"
            
            # Execute forge script
            result = self.detector.execute_forge_command(
                "script",
                args=[
                    str(script_path),
                    "--rpc-url", self.rpc_url,
                    "--private-key", private_key,
                    "--broadcast",
                    "-vv"
                ],
                cwd=project_root,
                timeout=600
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "output": result.stdout,
                    "subnet": self.subnet_name,
                    "rpc_url": self.rpc_url
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr,
                    "output": result.stdout
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Deployment timed out"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def compile_contracts(self, project_root: Path) -> Dict[str, Any]:
        """Compile contracts using Forge"""
        if not is_forge_available():
            return {
                "success": False,
                "error": "Forge is not installed or not in PATH"
            }
        
        try:
            result = self.detector.execute_forge_command(
                "build",
                cwd=project_root,
                timeout=120
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "output": result.stdout
                }
            else:
                return {
                    "success": False,
                    "error": result.stderr,
                    "output": result.stdout
                }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Compilation timed out"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def execute_subnet_command(
        self, 
        command: str, 
        args: List[str] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Execute an Avalanche CLI subnet command
        
        Args:
            command: Command to execute (e.g., "subnet list", "subnet deploy")
            args: Additional arguments
            timeout: Command timeout
            
        Returns:
            Dictionary with success status and output
        """
        if not is_avalanche_cli_available():
            return {
                "success": False,
                "error": "Avalanche CLI is not installed or not in PATH"
            }
        
        try:
            result = self.detector.execute_avalanche_command(
                command,
                args=args,
                timeout=timeout
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "error": result.stderr if result.returncode != 0 else None,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"Command '{command}' timed out"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def blockchain_describe(self, blockchain_name: str = None) -> Dict[str, Any]:
        """
        Execute 'avalanche blockchain describe' command
        
        Args:
            blockchain_name: Name of the blockchain (optional, defaults to subnet name)
            
        Returns:
            Dictionary with blockchain description
        """
        blockchain = blockchain_name or self.subnet_name
        return self.execute_subnet_command(
            "blockchain describe",
            args=[blockchain] if blockchain else None,
            timeout=10
        )
    
    def network_run(self, network_name: str = None, args: List[str] = None) -> Dict[str, Any]:
        """
        Execute 'avalanche network run' command
        
        Args:
            network_name: Name of the network (optional, defaults to subnet name)
            args: Additional arguments for the run command
            
        Returns:
            Dictionary with command result
        """
        cmd_args = []
        if network_name:
            cmd_args.append(network_name)
        elif self.subnet_name:
            cmd_args.append(self.subnet_name)
        
        if args:
            cmd_args.extend(args)
        
        return self.execute_subnet_command(
            "network run",
            args=cmd_args,
            timeout=30
        )
    
    def network_status(self, network_name: str = None) -> Dict[str, Any]:
        """
        Execute 'avalanche network status' command
        
        Note: This command doesn't accept network name as argument,
        it shows status for the currently running network.
        
        Args:
            network_name: Not used (command doesn't accept args), kept for API compatibility
            
        Returns:
            Dictionary with network status
        """
        # network status doesn't take arguments - it shows current network status
        return self.execute_subnet_command(
            "network status",
            args=None,
            timeout=10
        )
    
    def key_list(self, network_name: str = None) -> Dict[str, Any]:
        """
        Execute 'avalanche key list' command
        
        Note: This command may require interactive network selection.
        For non-interactive use, consider using --network flag if available.
        
        Args:
            network_name: Network name for non-interactive mode (if supported)
            
        Returns:
            Dictionary with list of keys
        """
        args = []
        # Try to pass network name if provided (may not work in all CLI versions)
        if network_name:
            args = [network_name]
        
        # For interactive commands, we might need to provide input
        # Try non-interactive first
        try:
            return self.execute_subnet_command(
                "key list",
                args=args,
                timeout=10
            )
        except Exception:
            # If that fails, it might require interactive input
            # Try with --network flag if available
            if network_name:
                return self.execute_subnet_command(
                    "key list",
                    args=["--network", network_name] if network_name else None,
                    timeout=10
                )
            # Return error indicating interactive input required
            return {
                "success": False,
                "error": "Command requires interactive input. Try running 'avalanche key list' manually.",
                "note": "This command may require network selection interactively"
            }
    
    def primary_describe(self, local: bool = True, cluster: str = None) -> Dict[str, Any]:
        """
        Execute 'avalanche primary describe' command
        
        Args:
            local: If True, use --local flag (default: True)
            cluster: Cluster name to use --cluster flag instead of --local
        
        Returns:
            Dictionary with primary network description
        """
        args = []
        # Use --local flag by default, or --cluster if specified
        if cluster:
            args = ["--cluster", cluster]
        elif local:
            args = ["--local"]
        
        try:
            return self.execute_subnet_command(
                "primary describe",
                args=args if args else None,
                timeout=10
            )
        except Exception as e:
            # If it requires interactive input, return helpful error
            return {
                "success": False,
                "error": f"Command execution failed: {str(e)}",
                "note": "Try running 'avalanche primary describe --local' manually",
                "suggestion": "Use --local flag for local network or --cluster <name> for cluster"
            }
    
    def get_available_commands(self) -> Dict[str, List[str]]:
        """Get available Avalanche CLI commands"""
        if not is_avalanche_cli_available():
            return {}
        
        detector = get_cli_detector()
        avalanche_result = detector.detect_avalanche_cli()
        
        if avalanche_result.installed and avalanche_result.available_commands:
            # Group commands by category
            commands_by_category = {
                "subnet": [cmd for cmd in avalanche_result.available_commands if cmd.startswith("subnet")],
                "network": [cmd for cmd in avalanche_result.available_commands if cmd.startswith("network")],
                "key": [cmd for cmd in avalanche_result.available_commands if cmd.startswith("key")],
                "other": [cmd for cmd in avalanche_result.available_commands 
                         if not any(cmd.startswith(prefix) for prefix in ["subnet", "network", "key"])]
            }
            return commands_by_category
        
        return {}
    
    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status of subnet interaction"""
        tools = self.check_tools()
        web3 = self.get_web3_instance()
        account = self.get_account()
        
        status = {
            "subnet_name": self.subnet_name,
            "tools": tools,
            "configuration": {
                "rpc_url": self.rpc_url,
                "has_private_key": self.private_key is not None,
                "web3_connected": web3 is not None if web3 else False,
                "has_account": account is not None,
            }
        }
        
        if account:
            status["configuration"]["account_address"] = account.address
            if web3:
                try:
                    balance = web3.eth.get_balance(account.address)
                    status["configuration"]["balance"] = str(balance)
                except Exception:
                    pass
        
        if is_avalanche_cli_available():
            status["available_commands"] = self.get_available_commands()
            subnet_info = self.get_subnet_info()
            if subnet_info:
                status["subnet_info"] = subnet_info
        
        return status


# Convenience functions
def create_subnet_interactor(subnet_name: str = None) -> SubnetInteractor:
    """Create a subnet interactor instance"""
    return SubnetInteractor(subnet_name)


def auto_detect_and_interact(subnet_name: str = None) -> Dict[str, Any]:
    """
    Automatically detect CLI tools and interact with subnet
    
    Returns:
        Dictionary with detection and interaction status
    """
    interactor = SubnetInteractor(subnet_name)
    return interactor.get_status()


def blockchain_describe(blockchain_name: str) -> Dict[str, Any]:
    """Quick function to describe a blockchain"""
    interactor = create_subnet_interactor()
    return interactor.blockchain_describe(blockchain_name)


def network_run(network_name: str = None, args: List[str] = None) -> Dict[str, Any]:
    """Quick function to run a network"""
    interactor = create_subnet_interactor(network_name)
    return interactor.network_run(network_name, args)


def network_status(network_name: str = None) -> Dict[str, Any]:
    """Quick function to get network status"""
    interactor = create_subnet_interactor(network_name)
    # network status doesn't take arguments - it shows current running network status
    return interactor.network_status()


def key_list(network_name: str = None) -> Dict[str, Any]:
    """Quick function to list keys"""
    interactor = create_subnet_interactor(network_name)
    return interactor.key_list(network_name)


def primary_describe(local: bool = True, cluster: str = None) -> Dict[str, Any]:
    """Quick function to describe primary network"""
    interactor = create_subnet_interactor()
    return interactor.primary_describe(local=local, cluster=cluster)


if __name__ == "__main__":
    # Test subnet interaction
    print("=== Subnet Interaction Test ===\n")
    
    interactor = SubnetInteractor()
    
    # Check tools
    print("Checking CLI tools...")
    tools = interactor.check_tools()
    for tool, available in tools.items():
        status = "✓" if available else "✗"
        print(f"  {status} {tool}: {'Available' if available else 'Not available'}")
    
    print()
    
    # Get status
    print("Getting subnet status...")
    status = interactor.get_status()
    print(f"  Subnet: {status['subnet_name']}")
    print(f"  RPC URL: {status['configuration']['rpc_url'] or 'Not configured'}")
    print(f"  Has Private Key: {status['configuration']['has_private_key']}")
    print(f"  Web3 Connected: {status['configuration']['web3_connected']}")
    
    if status['configuration'].get('account_address'):
        print(f"  Account: {status['configuration']['account_address']}")
        if status['configuration'].get('balance'):
            print(f"  Balance: {status['configuration']['balance']} wei")
    
    print()
    
    # List available commands
    if tools.get('avalanche_cli'):
        print("Available Avalanche CLI commands:")
        commands = interactor.get_available_commands()
        for category, cmd_list in commands.items():
            if cmd_list:
                print(f"  {category}:")
                for cmd in cmd_list[:5]:  # Show first 5
                    print(f"    - {cmd}")
    
    print()
    print("=== Status Summary ===")
    print(json.dumps(status, indent=2, default=str))


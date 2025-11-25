"""
CLI Detection and Auto-Discovery Utility
Automatically detects Forge and Avalanche CLI installations and discovers available commands
"""
import os
import subprocess
import json
import shutil
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Any
from dataclasses import dataclass


@dataclass
class CLIDetectionResult:
    """Result of CLI detection"""
    installed: bool
    version: Optional[str] = None
    path: Optional[str] = None
    available_commands: Optional[List[str]] = None
    error: Optional[str] = None


class CLIDetector:
    """Detects and interacts with Forge and Avalanche CLI"""
    
    def __init__(self):
        self.forge_status: Optional[CLIDetectionResult] = None
        self.avalanche_status: Optional[CLIDetectionResult] = None
        self.avalanche_commands: Dict[str, List[str]] = {}
        
    def detect_forge(self) -> CLIDetectionResult:
        """Detect if Forge is installed"""
        if self.forge_status is not None:
            return self.forge_status
            
        result = CLIDetectionResult(installed=False)
        
        # Check if forge is in PATH
        forge_path = shutil.which("forge")
        if forge_path:
            result.path = forge_path
            
            # Try to get version
            try:
                version_result = subprocess.run(
                    ["forge", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if version_result.returncode == 0:
                    result.installed = True
                    # Parse version from output (e.g., "forge 0.2.0 (abc123)")
                    version_line = version_result.stdout.strip().split('\n')[0]
                    result.version = version_line.split()[1] if len(version_line.split()) > 1 else version_line
                else:
                    result.error = version_result.stderr
            except subprocess.TimeoutExpired:
                result.error = "Command timed out"
            except Exception as e:
                result.error = str(e)
        else:
            result.error = "forge not found in PATH"
        
        self.forge_status = result
        return result
    
    def detect_avalanche_cli(self) -> CLIDetectionResult:
        """Detect if Avalanche CLI is installed"""
        if self.avalanche_status is not None:
            return self.avalanche_status
            
        result = CLIDetectionResult(installed=False)
        
        # Check if avalanche is in PATH
        avalanche_path = shutil.which("avalanche")
        if avalanche_path:
            result.path = avalanche_path
            
            # Try to get version
            try:
                version_result = subprocess.run(
                    ["avalanche", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if version_result.returncode == 0:
                    result.installed = True
                    result.version = version_result.stdout.strip()
                    
                    # Discover available commands
                    commands = self._discover_avalanche_commands()
                    result.available_commands = commands
                    self.avalanche_commands = self._parse_command_structure()
                else:
                    result.error = version_result.stderr
            except subprocess.TimeoutExpired:
                result.error = "Command timed out"
            except Exception as e:
                result.error = str(e)
        else:
            result.error = "avalanche not found in PATH"
        
        self.avalanche_status = result
        return result
    
    def _discover_avalanche_commands(self) -> List[str]:
        """Discover all available Avalanche CLI commands"""
        commands = []
        
        try:
            # Get main help
            help_result = subprocess.run(
                ["avalanche", "--help"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if help_result.returncode == 0:
                output = help_result.stdout
                
                # Parse commands from help output
                lines = output.split('\n')
                in_commands_section = False
                
                for line in lines:
                    line = line.strip()
                    
                    # Look for command sections
                    if 'Commands:' in line or 'Available Commands:' in line:
                        in_commands_section = True
                        continue
                    
                    if in_commands_section:
                        # Skip separators
                        if not line or line.startswith('-'):
                            continue
                        
                        # Stop if we hit another section
                        if line.startswith('Flags:') or line.startswith('Global Flags:') or line.startswith('Use') or line.startswith('Run'):
                            break
                        
                        # Extract command name (first word)
                        parts = line.split()
                        if parts:
                            cmd = parts[0]
                            # Skip non-command lines (only accept lowercase commands, not sentences)
                            if cmd and cmd[0].islower() and len(cmd) < 20 and cmd not in ['use', 'run', 'the', 'to', 'but', 'and', 'or']:
                                # Check if it's a real command (not a sentence)
                                if not any(word in cmd.lower() for word in ['available', 'usage', 'config', 'log', 'level', 'skip', 'update', 'check']):
                                    commands.append(cmd)
                
                # Also try to discover subcommands for known top-level commands
                top_level_commands = ['subnet', 'network', 'key', 'vm', 'plugin']
                for top_cmd in top_level_commands:
                    try:
                        sub_help = subprocess.run(
                            ["avalanche", top_cmd, "--help"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if sub_help.returncode == 0:
                            # Parse subcommands
                            sub_lines = sub_help.stdout.split('\n')
                            for sub_line in sub_lines:
                                sub_line = sub_line.strip()
                                parts = sub_line.split()
                                if parts and parts[0] not in ['Use', 'Run', 'Flags:', 'Global']:
                                    full_cmd = f"{top_cmd} {parts[0]}"
                                    if full_cmd not in commands:
                                        commands.append(full_cmd)
                    except Exception:
                        continue
        except Exception as e:
            pass
        
        return sorted(set(commands))
    
    def _parse_command_structure(self) -> Dict[str, List[str]]:
        """Parse Avalanche CLI command structure into a hierarchical dictionary"""
        structure = {}
        
        # Known top-level commands
        top_commands = ['subnet', 'network', 'key', 'vm', 'plugin', 'transaction', 'info']
        
        for top_cmd in top_commands:
            try:
                help_result = subprocess.run(
                    ["avalanche", top_cmd, "--help"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if help_result.returncode == 0:
                    subcommands = []
                    output = help_result.stdout
                    lines = output.split('\n')
                    in_commands = False
                    
                    for line in lines:
                        line = line.strip()
                        if 'Commands:' in line or 'Available Commands:' in line:
                            in_commands = True
                            continue
                        
                        if in_commands:
                            # Stop if we hit another section
                            if line.startswith('Flags:') or line.startswith('Global Flags:') or line.startswith('Use') or line.startswith('Run'):
                                break
                            
                            if not line or line.startswith('-'):
                                continue
                            
                            parts = line.split()
                            if parts and parts[0][0].islower():
                                cmd = parts[0]
                                # Filter out non-commands
                                if len(cmd) < 20 and cmd not in ['use', 'run', 'the', 'to', 'but', 'and', 'or']:
                                    if not any(word in cmd.lower() for word in ['available', 'usage', 'config', 'log', 'level', 'skip', 'update', 'check']):
                                        subcommands.append(cmd)
                    
                    if subcommands:
                        structure[top_cmd] = subcommands
            except Exception:
                continue
        
        return structure
    
    def get_subnet_commands(self) -> List[str]:
        """Get list of subnet-related commands"""
        if 'subnet' not in self.avalanche_commands:
            if self.avalanche_status and self.avalanche_status.installed:
                self.avalanche_commands = self._parse_command_structure()
        
        subnet_cmds = self.avalanche_commands.get('subnet', [])
        return [f"subnet {cmd}" for cmd in subnet_cmds]
    
    def execute_avalanche_command(
        self, 
        command: str, 
        args: List[str] = None,
        timeout: int = 30,
        capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """
        Execute an Avalanche CLI command
        
        Args:
            command: Command to execute (e.g., "subnet deploy" or "subnet list")
            args: Additional arguments
            timeout: Command timeout in seconds
            capture_output: Whether to capture output
            
        Returns:
            subprocess.CompletedProcess result
        """
        if not self.avalanche_status or not self.avalanche_status.installed:
            self.detect_avalanche_cli()
        
        if not self.avalanche_status.installed:
            raise RuntimeError("Avalanche CLI is not installed or not in PATH")
        
        cmd_parts = command.split()
        if args:
            cmd_parts.extend(args)
        
        return subprocess.run(
            ["avalanche"] + cmd_parts,
            capture_output=capture_output,
            text=True,
            timeout=timeout
        )
    
    def execute_forge_command(
        self,
        command: str,
        args: List[str] = None,
        cwd: Optional[Path] = None,
        timeout: int = 120,
        capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """
        Execute a Forge command
        
        Args:
            command: Command to execute (e.g., "build", "test", "script")
            args: Additional arguments
            cwd: Working directory
            timeout: Command timeout in seconds
            capture_output: Whether to capture output
            
        Returns:
            subprocess.CompletedProcess result
        """
        if not self.forge_status or not self.forge_status.installed:
            self.detect_forge()
        
        if not self.forge_status.installed:
            raise RuntimeError("Forge is not installed or not in PATH")
        
        cmd_parts = ["forge", command]
        if args:
            cmd_parts.extend(args)
        
        return subprocess.run(
            cmd_parts,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            timeout=timeout
        )
    
    def list_subnets(self) -> List[Dict[str, Any]]:
        """List available subnets using Avalanche CLI"""
        try:
            result = self.execute_avalanche_command("subnet list", timeout=10)
            if result.returncode != 0:
                return []
            
            subnets = []
            lines = result.stdout.split('\n')
            
            # Parse subnet list output
            # Format is typically: NAME | STATUS | ...
            header_found = False
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if 'NAME' in line.upper() and 'STATUS' in line.upper():
                    header_found = True
                    continue
                
                if header_found and not line.startswith('-'):
                    parts = [p.strip() for p in line.split('|')]
                    if parts:
                        subnet_info = {
                            "name": parts[0],
                            "status": parts[1] if len(parts) > 1 else "unknown",
                        }
                        # Add any additional fields
                        if len(parts) > 2:
                            subnet_info["details"] = parts[2:]
                        subnets.append(subnet_info)
            
            return subnets
        except Exception as e:
            return []
    
    def get_subnet_info(self, subnet_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a subnet"""
        # First try reading from filesystem (more reliable)
        try:
            from pathlib import Path
            import json
            avalanche_home = Path.home() / ".avalanche-cli"
            subnet_dir = avalanche_home / "subnets" / subnet_name
            
            if not subnet_dir.exists():
                return None
            
            info = {"name": subnet_name}
            
            # Read sidecar.json if available
            sidecar_file = subnet_dir / "sidecar.json"
            if sidecar_file.exists():
                try:
                    sidecar = json.loads(sidecar_file.read_text())
                    info["vm"] = sidecar.get("VM", "")
                    info["vm_version"] = sidecar.get("VMVersion", "")
                    info["chain_id"] = sidecar.get("ChainID", "")
                    
                    # Get blockchain ID from networks
                    networks = sidecar.get("Networks", {})
                    for network_name in ["Local", "local", "Fuji", "fuji"]:
                        if network_name in networks:
                            network = networks[network_name]
                            blockchain_id = network.get("BlockchainID") or network.get("blockchainID")
                            if blockchain_id:
                                info["blockchain_id"] = blockchain_id
                                # Always use Chaos Star Network RPC - never use port 9650
                                info["rpc_url"] = "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc"
                                break
                except Exception:
                    pass
            
            # If we got info from filesystem, return it
            if info.get("blockchain_id") or info.get("rpc_url"):
                return info
        except Exception:
            pass
        
        # Fallback to CLI command (without --local flag which may not exist)
        try:
            result = self.execute_avalanche_command(
                f"subnet describe {subnet_name}",
                timeout=10
            )
            
            if result.returncode == 0:
                # Parse the output
                output = result.stdout
                info = {
                    "name": subnet_name,
                    "raw_output": output,
                }
                
                # Try to extract structured info
                lines = output.split('\n')
                for line in lines:
                    if '|' in line:
                        parts = [p.strip() for p in line.split('|')]
                        if len(parts) >= 2:
                            key = parts[0].lower().replace(' ', '_')
                            value = parts[1]
                            if 'rpc' in key or 'url' in key:
                                info['rpc_url'] = value
                            elif 'key' in key and '0x' in value:
                                info['private_key'] = value
                            elif 'blockchain' in key and 'id' in key:
                                info['blockchain_id'] = value
                
                return info
        except Exception:
            pass
        
        return None
    
    def get_detection_summary(self) -> Dict[str, Any]:
        """Get summary of CLI detection status"""
        forge = self.detect_forge()
        avalanche = self.detect_avalanche_cli()
        
        return {
            "forge": {
                "installed": forge.installed,
                "version": forge.version,
                "path": forge.path,
                "error": forge.error
            },
            "avalanche_cli": {
                "installed": avalanche.installed,
                "version": avalanche.version,
                "path": avalanche.path,
                "available_commands": avalanche.available_commands,
                "subnet_commands": self.get_subnet_commands(),
                "error": avalanche.error
            }
        }


# Global instance
_detector_instance: Optional[CLIDetector] = None


def get_cli_detector() -> CLIDetector:
    """Get or create the global CLI detector instance"""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = CLIDetector()
    return _detector_instance


def detect_tools() -> Dict[str, Any]:
    """Quick function to detect all CLI tools"""
    detector = get_cli_detector()
    return detector.get_detection_summary()


def is_forge_available() -> bool:
    """Check if Forge is available"""
    detector = get_cli_detector()
    return detector.detect_forge().installed


def is_avalanche_cli_available() -> bool:
    """Check if Avalanche CLI is available"""
    detector = get_cli_detector()
    return detector.detect_avalanche_cli().installed


if __name__ == "__main__":
    # Test CLI detection
    print("=== CLI Detection Test ===\n")
    
    detector = CLIDetector()
    
    # Detect Forge
    print("Detecting Forge...")
    forge_result = detector.detect_forge()
    if forge_result.installed:
        print(f"✓ Forge {forge_result.version} found at {forge_result.path}")
    else:
        print(f"✗ Forge not found: {forge_result.error}")
    
    print()
    
    # Detect Avalanche CLI
    print("Detecting Avalanche CLI...")
    avalanche_result = detector.detect_avalanche_cli()
    if avalanche_result.installed:
        print(f"✓ Avalanche CLI {avalanche_result.version} found at {avalanche_result.path}")
        print(f"  Available commands: {len(avalanche_result.available_commands or [])}")
        if avalanche_result.available_commands:
            print(f"  Sample commands: {', '.join(avalanche_result.available_commands[:10])}")
        
        subnet_cmds = detector.get_subnet_commands()
        if subnet_cmds:
            print(f"  Subnet commands: {', '.join(subnet_cmds)}")
    else:
        print(f"✗ Avalanche CLI not found: {avalanche_result.error}")
    
    print()
    
    # List subnets
    if avalanche_result.installed:
        print("Listing subnets...")
        subnets = detector.list_subnets()
        if subnets:
            print(f"✓ Found {len(subnets)} subnet(s):")
            for subnet in subnets:
                print(f"  - {subnet.get('name', 'unknown')} ({subnet.get('status', 'unknown')})")
        else:
            print("  No subnets found")
    
    print()
    print("=== Detection Summary ===")
    summary = detector.get_detection_summary()
    print(json.dumps(summary, indent=2))


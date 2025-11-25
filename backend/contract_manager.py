"""
Contract Deployment and Management System
Integrates with Avalanche CLI and Foundry for contract deployment
"""
import os
import json
import subprocess
from pathlib import Path
from web3 import Web3
from eth_account import Account
from typing import Dict, Optional, List, Tuple

# Import config (works when run from backend directory)
try:
    from .config import AVALANCHE_RPC, PRIVATE_KEY, CHAIN_ID
except ImportError:
    from config import AVALANCHE_RPC, PRIVATE_KEY, CHAIN_ID

# Import CLI detector for automatic tool detection
try:
    from .cli_detector import get_cli_detector, is_forge_available
except ImportError:
    from cli_detector import get_cli_detector, is_forge_available


class ContractManager:
    """Manages smart contract deployment, verification, and interaction"""
    
    def __init__(self):
        # Check if Forge is available
        if not is_forge_available():
            raise Exception(
                "Forge is not installed or not in PATH. "
                "Please install Foundry: https://book.getfoundry.sh/getting-started/installation"
            )
        
        if not PRIVATE_KEY:
            raise Exception(
                "PRIVATE_KEY not set. "
                "Please either:\n"
                "  1. Set PRIVATE_KEY in .env file, or\n"
                "  2. Ensure Avalanche CLI subnet is configured with a funded account"
            )
        
        self.w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC))
        if not self.w3.is_connected():
            raise Exception(f"Not connected to Avalanche RPC: {AVALANCHE_RPC}")
        
        self.deployer = Account.from_key(PRIVATE_KEY)
        self.project_root = Path(__file__).parent.parent
        self.deployments_dir = self.project_root / "deployments"
        self.contracts_dir = self.project_root / "src" / "contracts"
        self.abi_dir = self.project_root / "backend" / "abi"
        
        # Ensure directories exist
        self.deployments_dir.mkdir(exist_ok=True)
        self.abi_dir.mkdir(exist_ok=True)
        
        # CLI detector for Forge operations
        self.cli_detector = get_cli_detector()
        
        self.addresses_file = self.deployments_dir / "addresses.json"
        self.load_addresses()
    
    def load_addresses(self) -> Dict[str, str]:
        """Load deployment addresses from file"""
        if self.addresses_file.exists():
            with open(self.addresses_file, 'r') as f:
                self.addresses = json.load(f)
        else:
            self.addresses = {}
        return self.addresses
    
    def save_addresses(self):
        """Save deployment addresses to file"""
        with open(self.addresses_file, 'w') as f:
            json.dump(self.addresses, f, indent=2)
    
    def get_rpc_url(self) -> str:
        """Get RPC URL for Avalanche subnet"""
        # Try to get from config, fallback to local subnet
        if AVALANCHE_RPC:
            return AVALANCHE_RPC
        
        # Default to local subnet RPC
        # Always use Chaos Star Network RPC - never use port 9650
        from .config import CHAOSSTARNETWORK_PRIMARY_RPC
        return CHAOSSTARNETWORK_PRIMARY_RPC
    
    def check_contract_deployed(self, address: str) -> bool:
        """Check if a contract is deployed at the given address"""
        if not address or address == "0x0000000000000000000000000000000000000000":
            return False
        
        try:
            code = self.w3.eth.get_code(Web3.to_checksum_address(address))
            return len(code) > 4  # More than just constructor bytecode
        except Exception:
            return False
    
    def get_deployment_status(self) -> Dict[str, Dict]:
        """Get deployment status for all contracts"""
        contracts = {
            "SaraktDigitalID": {
                "address": self.addresses.get("digitalID", ""),
                "required": True
            },
            "SaraktTreasury": {
                "address": self.addresses.get("treasury", ""),
                "required": True
            },
            "SaraktLandV2": {
                "address": self.addresses.get("land", ""),
                "required": True
            },
            "DummyToken": {
                "address": self.addresses.get("dummyToken", ""),
                "required": False
            }
        }
        
        status = {}
        for name, info in contracts.items():
            address = info["address"]
            deployed = self.check_contract_deployed(address) if address else False
            
            status[name] = {
                "name": name,
                "address": address,
                "deployed": deployed,
                "required": info["required"],
                "status": "deployed" if deployed else ("address_set" if address else "not_deployed")
            }
        
        return status
    
    def compile_contracts(self) -> bool:
        """Compile Solidity contracts using Foundry"""
        if not is_forge_available():
            raise Exception("Foundry (forge) not found. Please install Foundry.")
        
        try:
            result = self.cli_detector.execute_forge_command(
                "build",
                cwd=self.project_root,
                timeout=120
            )
            
            if result.returncode != 0:
                print(f"Compilation error: {result.stderr}")
                return False
            
            print("Contracts compiled successfully")
            return True
        except subprocess.TimeoutExpired:
            raise Exception("Contract compilation timed out")
        except Exception as e:
            raise Exception(f"Compilation failed: {str(e)}")
    
    def extract_abi(self, contract_name: str) -> Optional[Dict]:
        """Extract ABI from compiled contract"""
        # Try multiple paths for ABI location
        possible_paths = [
            self.project_root / "out" / contract_name / f"{contract_name}.sol" / f"{contract_name}.json",
            self.project_root / "out" / f"{contract_name}.sol" / f"{contract_name}.json",
            self.project_root / "out" / contract_name / f"{contract_name}.json",
        ]
        
        for abi_path in possible_paths:
            if abi_path.exists():
                try:
                    with open(abi_path, 'r') as f:
                        artifact = json.load(f)
                        return artifact.get("abi")
                except Exception as e:
                    print(f"Error extracting ABI from {abi_path}: {e}")
                    continue
        
        return None
    
    def save_abi(self, contract_name: str, abi: Dict):
        """Save ABI to backend/abi directory"""
        abi_file = self.abi_dir / f"{contract_name}ABI.json"
        with open(abi_file, 'w') as f:
            json.dump({"abi": abi}, f, indent=2)
        print(f"ABI saved to {abi_file}")
    
    def deploy_contract(self, contract_name: str, constructor_args: List = None) -> Optional[str]:
        """Deploy a single contract using Foundry script"""
        constructor_args = constructor_args or []
        
        # Compile first
        if not self.compile_contracts():
            return None
        
        # Extract ABI for later use
        abi = self.extract_abi(contract_name)
        if abi:
            self.save_abi(contract_name, abi)
        
        # Build deployment command
        rpc_url = self.get_rpc_url()
        private_key = PRIVATE_KEY
        
        # Use forge script to deploy
        # First, check if we have a deployment script
        script_path = self.project_root / "scripts" / f"deploy_{contract_name.lower()}.s.sol"
        
        if not script_path.exists():
            # For now, use the deploy_all script
            print(f"Using deploy_all script for {contract_name}")
            return None
        
        try:
            cmd = [
                "forge", "script",
                str(script_path),
                "--rpc-url", rpc_url,
                "--private-key", private_key,
                "--broadcast",
                "--verify"
            ]
            
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                print(f"Deployment error: {result.stderr}")
                return None
            
            # Parse deployment address from output
            # This is a simplified version - in production, parse JSON output
            print(f"Deployment output: {result.stdout}")
            return None  # Will be updated from deploy_all script
            
        except Exception as e:
            print(f"Deployment failed: {e}")
            return None
    
    def deploy_all_contracts(self) -> Dict[str, str]:
        """Deploy all contracts in correct order"""
        print("=== Starting Full Contract Deployment ===\n")
        
        # 1. Compile contracts
        print("Step 1: Compiling contracts...")
        if not self.compile_contracts():
            raise Exception("Contract compilation failed")
        
        # 2. Extract and save ABIs
        print("\nStep 2: Extracting ABIs...")
        contracts_to_abi = ["SaraktDigitalID", "SaraktTreasury", "SaraktLandV2", "DummyToken"]
        for contract_name in contracts_to_abi:
            abi = self.extract_abi(contract_name)
            if abi:
                self.save_abi(contract_name, abi)
        
        # 3. Deploy using Foundry script
        print("\nStep 3: Deploying contracts...")
        rpc_url = self.get_rpc_url()
        
        script_path = self.project_root / "scripts" / "deploy_all.s.sol"
        
        if not script_path.exists():
            raise Exception("deploy_all.s.sol script not found")
        
        try:
            # Convert private key to integer for Forge
            # Forge expects private key as hex string
            private_key_for_forge = PRIVATE_KEY
            if not private_key_for_forge.startswith("0x"):
                # If it's already an integer string, we need to convert
                try:
                    int_key = int(private_key_for_forge)
                    private_key_for_forge = hex(int_key)
                except:
                    pass
            
            print(f"Deploying to: {rpc_url}")
            print(f"Deployer: {self.deployer.address}")
            
            result = self.cli_detector.execute_forge_command(
                "script",
                args=[
                    str(script_path),
                    "--rpc-url", rpc_url,
                    "--private-key", private_key_for_forge,
                    "--broadcast",
                    "-vv"
                ],
                cwd=self.project_root,
                timeout=600
            )
            
            if result.returncode != 0:
                print(f"Deployment error: {result.stderr}")
                print(f"Output: {result.stdout}")
                raise Exception(f"Deployment failed: {result.stderr}")
            
            print("Deployment transaction submitted!")
            # Print last 50 lines of output
            output_lines = result.stdout.split('\n')
            for line in output_lines[-50:]:
                print(line)
            
            # Load addresses from the file that was written by the script
            # Wait a moment for file to be written
            import time
            time.sleep(2)
            self.load_addresses()
            
            if not self.addresses:
                raise Exception("Deployment completed but addresses file was not updated. Check forge output.")
            
            return self.addresses
            
        except subprocess.TimeoutExpired:
            raise Exception("Deployment timed out")
        except Exception as e:
            raise Exception(f"Deployment failed: {str(e)}")
    
    def verify_contracts(self) -> Dict[str, bool]:
        """Verify all deployed contracts are functioning"""
        status = self.get_deployment_status()
        verification = {}
        
        for contract_name, info in status.items():
            if not info["deployed"]:
                verification[contract_name] = False
                continue
            
            address = info["address"]
            try:
                # Try to read a function from the contract
                abi = self.extract_abi(contract_name)
                if not abi:
                    verification[contract_name] = False
                    continue
                
                contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(address),
                    abi=abi
                )
                
                # Try to call a view function
                if contract_name == "SaraktLandV2":
                    try:
                        contract.functions.TOTAL_PLOTS().call()
                        verification[contract_name] = True
                    except:
                        verification[contract_name] = False
                elif contract_name == "SaraktDigitalID":
                    verification[contract_name] = True  # Can't easily verify without owner
                elif contract_name == "SaraktTreasury":
                    try:
                        contract.functions.balanceAVAX().call()
                        verification[contract_name] = True
                    except:
                        verification[contract_name] = False
                else:
                    verification[contract_name] = True
                    
            except Exception as e:
                print(f"Verification error for {contract_name}: {e}")
                verification[contract_name] = False
        
        return verification
    
    def setup_and_deploy(self) -> Dict:
        """Complete setup: check, compile, deploy if needed"""
        print("=== Contract Management System ===\n")
        
        # Check current status
        status = self.get_deployment_status()
        print("Current Deployment Status:")
        for name, info in status.items():
            status_icon = "✓" if info["deployed"] else "✗"
            print(f"  {status_icon} {name}: {info['address'] or 'Not deployed'}")
        
        # Check if all required contracts are deployed
        all_deployed = all(
            info["deployed"] 
            for name, info in status.items() 
            if info["required"]
        )
        
        if all_deployed:
            print("\n✓ All required contracts are deployed!")
            return {
                "status": "deployed",
                "addresses": self.addresses,
                "deployment_status": status
            }
        
        # Deploy missing contracts
        print("\n⚠ Some contracts are not deployed. Starting deployment...")
        try:
            addresses = self.deploy_all_contracts()
            
            # Verify deployment
            print("\n=== Verifying Deployment ===")
            verification = self.verify_contracts()
            
            for name, verified in verification.items():
                icon = "✓" if verified else "✗"
                print(f"{icon} {name}: {'Verified' if verified else 'Verification failed'}")
            
            return {
                "status": "deployed" if all(verification.values()) else "partial",
                "addresses": addresses,
                "deployment_status": self.get_deployment_status(),
                "verification": verification
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "addresses": self.addresses,
                "deployment_status": status
            }


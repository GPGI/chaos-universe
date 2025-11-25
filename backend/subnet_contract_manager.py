"""
Subnet-Specific Contract Deployment and Management System
Automatically deploys contracts to subnets and stores ABIs and addresses per subnet
"""
import os
import json
import subprocess
from pathlib import Path
from web3 import Web3
from eth_account import Account
from typing import Dict, Optional, List, Tuple

# Import config
try:
    from .config import AVALANCHE_RPC, PRIVATE_KEY, ADMIN_PRIVATE_KEY
except ImportError:
    from config import AVALANCHE_RPC, PRIVATE_KEY, ADMIN_PRIVATE_KEY

# Import CLI detector for automatic tool detection
try:
    from .cli_detector import get_cli_detector, is_forge_available
    from .subnet_interaction import create_subnet_interactor
except ImportError:
    from cli_detector import get_cli_detector, is_forge_available
    from subnet_interaction import create_subnet_interactor


class SubnetContractManager:
    """Manages smart contract deployment, verification, and interaction for specific subnets"""
    
    def __init__(self, subnet_name: str):
        """
        Initialize contract manager for a specific subnet
        
        Args:
            subnet_name: Name of the subnet (star system)
        """
        self.subnet_name = subnet_name
        
        # Check if Forge is available
        if not is_forge_available():
            raise Exception(
                "Forge is not installed or not in PATH. "
                "Please install Foundry: https://book.getfoundry.sh/getting-started/installation"
            )
        
        # Get subnet interactor to get RPC and admin keys
        self.interactor = create_subnet_interactor(subnet_name)
        
        # Get RPC URL for this subnet
        self.rpc_url = self.interactor.get_rpc_url()
        if not self.rpc_url:
            # Fallback to default RPC URL
            # Always use Chaos Star Network RPC - never use port 9650
            self.rpc_url = AVALANCHE_RPC
        
        # Get admin private key for this subnet
        self.private_key = self.interactor.get_private_key() or ADMIN_PRIVATE_KEY or PRIVATE_KEY
        if not self.private_key:
            raise Exception(
                f"PRIVATE_KEY not found for subnet '{subnet_name}'. "
                "Please ensure the subnet is configured with a funded account."
            )
        
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        if not self.w3.is_connected():
            raise Exception(f"Not connected to subnet RPC: {self.rpc_url}")
        
        self.deployer = Account.from_key(self.private_key)
        self.project_root = Path(__file__).parent.parent
        self.contracts_dir = self.project_root / "src" / "contracts"
        
        # Subnet-specific directories
        subnet_deployments_dir = self.project_root / "deployments" / subnet_name
        subnet_abi_dir = self.project_root / "backend" / "abi" / subnet_name
        
        # Ensure directories exist
        subnet_deployments_dir.mkdir(parents=True, exist_ok=True)
        subnet_abi_dir.mkdir(parents=True, exist_ok=True)
        
        self.deployments_dir = subnet_deployments_dir
        self.abi_dir = subnet_abi_dir
        
        # CLI detector for Forge operations
        self.cli_detector = get_cli_detector()
        
        # Addresses file for this subnet
        self.addresses_file = self.deployments_dir / "addresses.json"
        self.load_addresses()
    
    def load_addresses(self) -> Dict[str, str]:
        """Load deployment addresses from file for this subnet"""
        if self.addresses_file.exists():
            with open(self.addresses_file, 'r') as f:
                self.addresses = json.load(f)
        else:
            self.addresses = {}
        return self.addresses
    
    def save_addresses(self):
        """Save deployment addresses to file for this subnet"""
        with open(self.addresses_file, 'w') as f:
            json.dump(self.addresses, f, indent=2)
        print(f"Addresses saved to {self.addresses_file}")
    
    def check_contract_deployed(self, address: str) -> bool:
        """Check if a contract is deployed at the given address"""
        if not address or address == "0x0000000000000000000000000000000000000000":
            return False
        
        try:
            code = self.w3.eth.get_code(Web3.to_checksum_address(address))
            return len(code) > 4  # More than just constructor bytecode
        except Exception:
            return False
    
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
        """Save ABI to backend/abi/{subnet_name} directory"""
        abi_file = self.abi_dir / f"{contract_name}ABI.json"
        with open(abi_file, 'w') as f:
            json.dump({"abi": abi, "subnet_name": self.subnet_name, "rpc_url": self.rpc_url}, f, indent=2)
        print(f"ABI saved to {abi_file}")
    
    def deploy_all_contracts(self) -> Dict[str, str]:
        """Deploy all contracts to this subnet and extract ABIs/addresses automatically"""
        print(f"=== Starting Contract Deployment to Subnet: {self.subnet_name} ===\n")
        
        # 1. Compile contracts
        print("Step 1: Compiling contracts...")
        if not self.compile_contracts():
            raise Exception("Contract compilation failed")
        
        # 2. Extract and save ABIs
        print("\nStep 2: Extracting ABIs...")
        contracts_to_abi = ["SaraktDigitalID", "SaraktTreasury", "SaraktLandV2", "DummyToken"]
        abis = {}
        for contract_name in contracts_to_abi:
            abi = self.extract_abi(contract_name)
            if abi:
                self.save_abi(contract_name, abi)
                abis[contract_name] = abi
        
        # 3. Deploy using Foundry script
        print(f"\nStep 3: Deploying contracts to subnet '{self.subnet_name}'...")
        print(f"RPC URL: {self.rpc_url}")
        print(f"Deployer: {self.deployer.address}")
        
        script_path = self.project_root / "scripts" / "deploy_all.s.sol"
        
        if not script_path.exists():
            raise Exception("deploy_all.s.sol script not found")
        
        try:
            # Prepare private key for Forge (needs to be hex string)
            private_key_for_forge = self.private_key
            if not private_key_for_forge.startswith("0x"):
                # Try to convert if it's an integer string
                try:
                    int_key = int(private_key_for_forge)
                    private_key_for_forge = hex(int_key)
                except:
                    # If not, assume it's already hex without 0x prefix
                    private_key_for_forge = f"0x{private_key_for_forge}"
            
            # Set environment variable for Forge script
            env = os.environ.copy()
            env["PRIVATE_KEY"] = str(int(private_key_for_forge, 16)) if private_key_for_forge.startswith("0x") else private_key_for_forge
            
            print(f"Deploying to: {self.rpc_url}")
            print(f"Deployer: {self.deployer.address}")
            
            result = self.cli_detector.execute_forge_command(
                "script",
                args=[
                    str(script_path),
                    "--rpc-url", self.rpc_url,
                    "--private-key", private_key_for_forge,
                    "--broadcast",
                    "-vv"
                ],
                cwd=self.project_root,
                timeout=600,
                env=env
            )
            
            if result.returncode != 0:
                print(f"Deployment error: {result.stderr}")
                print(f"Output: {result.stdout}")
                raise Exception(f"Deployment failed: {result.stderr}")
            
            print("Deployment transaction submitted!")
            
            # 4. Parse deployment addresses from output and forge deployment files
            print("\nStep 4: Extracting deployment addresses...")
            self._extract_addresses_from_forge_output(result.stdout)
            
            # Also check forge deployment directory for addresses
            self._extract_addresses_from_forge_deployments()
            
            # Wait a moment for file to be written
            import time
            time.sleep(2)
            self.load_addresses()
            
            if not self.addresses:
                raise Exception("Deployment completed but addresses were not extracted. Check forge output.")
            
            print(f"\n✓ Contracts deployed successfully to subnet '{self.subnet_name}'!")
            print("Deployed Addresses:")
            for name, addr in self.addresses.items():
                print(f"  {name}: {addr}")
            
            return self.addresses
            
        except subprocess.TimeoutExpired:
            raise Exception("Deployment timed out")
        except Exception as e:
            raise Exception(f"Deployment failed: {str(e)}")
    
    def _extract_addresses_from_forge_output(self, output: str):
        """Extract addresses from forge script output"""
        lines = output.split('\n')
        for line in lines:
            # Look for deployed at: patterns
            if "deployed at:" in line.lower() or "deployed:" in line.lower():
                parts = line.split(":")
                if len(parts) >= 2:
                    address = parts[-1].strip()
                    # Clean up address (remove any trailing characters)
                    address = address.split()[0] if address else ""
                    if address.startswith("0x") and len(address) == 42:
                        # Try to match contract name from line
                        line_lower = line.lower()
                        if "digitalid" in line_lower or "saraktdigitalid" in line_lower:
                            self.addresses["digitalID"] = address
                        elif "treasury" in line_lower or "sarakttreasury" in line_lower:
                            self.addresses["treasury"] = address
                        elif "land" in line_lower or "saraktland" in line_lower:
                            self.addresses["land"] = address
                        elif "dummytoken" in line_lower or ("dummy" in line_lower and "token" in line_lower):
                            self.addresses["dummyToken"] = address
                
                # Also check for console.log patterns: "ContractName deployed at: 0x..."
                if "deployed" in line_lower:
                    # Try to find contract name before "deployed"
                    for contract_pattern in [
                        ("saraktdigitalid", "digitalID"),
                        ("sarakttreasury", "treasury"),
                        ("saraktlandv2", "land"),
                        ("saraktland", "land"),
                        ("dummytoken", "dummyToken")
                    ]:
                        if contract_pattern[0] in line_lower:
                            # Extract address (should be after "deployed at:" or ":")
                            address_match = None
                            if "0x" in line:
                                import re
                                addresses = re.findall(r'0x[a-fA-F0-9]{40}', line)
                                if addresses:
                                    self.addresses[contract_pattern[1]] = addresses[-1]  # Use last address found
                                    break
    
    def _extract_addresses_from_forge_deployments(self):
        """Extract addresses from forge deployment JSON files"""
        # Forge stores deployments in broadcast/{script_name}/{chain_id}/run-latest.json
        broadcast_dir = self.project_root / "broadcast"
        if not broadcast_dir.exists():
            return
        
        # Find the latest deployment
        script_name = "deploy_all.s.sol"
        chain_id = self.w3.eth.chain_id
        
        deployment_file = broadcast_dir / script_name / str(chain_id) / "run-latest.json"
        if not deployment_file.exists():
            # Try alternative paths
            for alt_file in broadcast_dir.rglob("run-latest.json"):
                if script_name in str(alt_file):
                    deployment_file = alt_file
                    break
        
        if deployment_file.exists():
            try:
                with open(deployment_file, 'r') as f:
                    data = json.load(f)
                
                # Extract addresses from transactions
                transactions = data.get("transactions", [])
                for tx in transactions:
                    if tx.get("transaction_type") == "CREATE" or tx.get("contractName"):
                        contract_name = tx.get("contract_name") or tx.get("contractName") or ""
                        address = tx.get("contract_address") or tx.get("contractAddress") or ""
                        
                        if address:
                            contract_name_lower = contract_name.lower()
                            if "digitalid" in contract_name_lower:
                                self.addresses["digitalID"] = address
                            elif "treasury" in contract_name_lower:
                                self.addresses["treasury"] = address
                            elif "land" in contract_name_lower:
                                self.addresses["land"] = address
                            elif "dummytoken" in contract_name_lower or ("dummy" in contract_name_lower and "token" in contract_name_lower):
                                self.addresses["dummyToken"] = address
                
                # Also check receipts
                receipts = data.get("receipts", [])
                for receipt in receipts:
                    contract_name = receipt.get("contract_name") or receipt.get("contractName") or ""
                    address = receipt.get("contract_address") or receipt.get("contractAddress") or ""
                    
                    if address:
                        contract_name_lower = contract_name.lower()
                        if "digitalid" in contract_name_lower:
                            self.addresses["digitalID"] = address
                        elif "treasury" in contract_name_lower:
                            self.addresses["treasury"] = address
                        elif "land" in contract_name_lower:
                            self.addresses["land"] = address
                        elif "dummytoken" in contract_name_lower or ("dummy" in contract_name_lower and "token" in contract_name_lower):
                            self.addresses["dummyToken"] = address
                
                # Save addresses
                if self.addresses:
                    self.save_addresses()
                    
            except Exception as e:
                print(f"Warning: Could not parse forge deployment file: {e}")
    
    def get_deployment_info(self) -> Dict:
        """Get complete deployment information for this subnet"""
        return {
            "subnet_name": self.subnet_name,
            "rpc_url": self.rpc_url,
            "deployer_address": self.deployer.address,
            "addresses": self.addresses,
            "abi_dir": str(self.abi_dir),
            "deployments_dir": str(self.deployments_dir)
        }
    
    def get_abi(self, contract_name: str) -> Optional[Dict]:
        """Get ABI for a contract from this subnet"""
        abi_file = self.abi_dir / f"{contract_name}ABI.json"
        if abi_file.exists():
            try:
                with open(abi_file, 'r') as f:
                    data = json.load(f)
                    return data.get("abi")
            except Exception:
                pass
        return None

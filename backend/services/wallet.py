import os
from web3 import Web3
from eth_account.messages import encode_defunct
from dotenv import load_dotenv
from alchemy_sdk import Alchemy, Network

load_dotenv()

# Try to load admin key from config (which auto-loads from Avalanche CLI subnet)
PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY")
if not PRIVATE_KEY:
    # Try loading from backend config which auto-discovers from subnet
    try:
        try:
            from backend.config import ADMIN_PRIVATE_KEY, PRIVATE_KEY as CONFIG_PRIVATE_KEY, AVALANCHE_RPC
            PRIVATE_KEY = ADMIN_PRIVATE_KEY or CONFIG_PRIVATE_KEY
        except ImportError:
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent.parent))
            from backend.config import ADMIN_PRIVATE_KEY, PRIVATE_KEY as CONFIG_PRIVATE_KEY, AVALANCHE_RPC
            PRIVATE_KEY = ADMIN_PRIVATE_KEY or CONFIG_PRIVATE_KEY
    except Exception:
        PRIVATE_KEY = None

# If still not found, try Avalanche CLI directly
if not PRIVATE_KEY:
    try:
        from backend.avalanche_key_loader import auto_load_funded_account_key
        subnet_name = os.getenv("AVALANCHE_SUBNET_NAME", "ChaosStarNetwork")
        PRIVATE_KEY = auto_load_funded_account_key(subnet_name=subnet_name, silent=True)
        if PRIVATE_KEY:
            os.environ["ADMIN_PRIVATE_KEY"] = PRIVATE_KEY
    except Exception:
        pass

if not PRIVATE_KEY:
    raise RuntimeError(
        "Missing ADMIN_PRIVATE_KEY. "
        "Please either:\n"
        "  1. Set ADMIN_PRIVATE_KEY in .env, or\n"
        "  2. Configure Avalanche CLI subnet with a funded account\n"
        "     (The system will auto-discover the admin key from the subnet)"
    )

ALCHEMY_KEY = os.getenv("ALCHEMY_KEY")

# Use subnet RPC if available, otherwise use Alchemy
try:
    try:
        from backend.config import AVALANCHE_RPC
        USE_SUBNET_RPC = True
    except ImportError:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent.parent))
        from backend.config import AVALANCHE_RPC
        USE_SUBNET_RPC = True
except Exception:
    USE_SUBNET_RPC = False

if USE_SUBNET_RPC and AVALANCHE_RPC:
    # Use subnet RPC for admin operations
    w3 = Web3(Web3.HTTPProvider(AVALANCHE_RPC))
    admin_account = w3.eth.account.from_key(PRIVATE_KEY)
    # Still initialize Alchemy for balance checks if key is available
    if ALCHEMY_KEY:
        alchemy = Alchemy(
            api_key=ALCHEMY_KEY,
            network=Network.AVALANCHE_MAINNET
        )
    else:
        alchemy = None
else:
    # Fallback to Alchemy if subnet RPC not available
    if not ALCHEMY_KEY:
        raise RuntimeError("Missing ALCHEMY_KEY env var (required when subnet RPC not available)")
    
    alchemy = Alchemy(
        api_key=ALCHEMY_KEY,
        network=Network.AVALANCHE_MAINNET
    )
    
    # Web3 provider via Alchemy RPC
    ALCHEMY_AVAX_RPC = f"https://avalanche-mainnet.g.alchemy.com/v2/{ALCHEMY_KEY}"
    w3 = Web3(Web3.HTTPProvider(ALCHEMY_AVAX_RPC))
    admin_account = w3.eth.account.from_key(PRIVATE_KEY)


def verify_signature(address: str, message: str, signature: str) -> bool:
    msg = encode_defunct(text=message)
    recovered = w3.eth.account.recover_message(msg, signature=signature)
    return recovered.lower() == address.lower()


async def get_wallet_balance(address: str):
    balance = await alchemy.core.get_balance(address)
    return balance


def send_tx(to: str, value_wei: int, gas: int = 21000, gas_price_gwei: int = 25):
    nonce = w3.eth.get_transaction_count(admin_account.address)
    
    tx = {
        "nonce": nonce,
        "to": to,
        "value": value_wei,
        "gas": gas,
        "gasPrice": w3.to_wei(gas_price_gwei, "gwei"),
        "chainId": w3.eth.chain_id
    }

    signed = admin_account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return tx_hash.hex()


def sign_message(message: str) -> str:
    msg = encode_defunct(text=message)
    s = w3.eth.account.sign_message(msg, private_key=PRIVATE_KEY)
    return s.signature.hex()

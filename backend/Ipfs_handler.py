import requests
import config

def upload_to_ipfs(file_path: str) -> str:
    """
    Upload a file to Pinata/IPFS.
    Returns the IPFS hash.
    """
    with open(file_path, "rb") as f:
        files = {"file": f}
        headers = {
            "pinata_api_key": config.PINATA_API_KEY,
            "pinata_secret_api_key": config.PINATA_SECRET_API_KEY,
        }
        response = requests.post(config.PINATA_BASE_URL, files=files, headers=headers)
        response.raise_for_status()
        ipfs_hash = response.json().get("IpfsHash")
        if not ipfs_hash:
            raise Exception(f"IPFS upload failed: {response.text}")
        return ipfs_hash

# Automatic Private Key Loading from Avalanche CLI

The system automatically loads the funded account private key from Avalanche CLI, eliminating the need to manually set `PRIVATE_KEY` in your `.env` file.

## How It Works

1. **First Priority**: If `PRIVATE_KEY` is set in `.env`, it uses that
2. **Auto-Loading**: If not set, it automatically extracts the key from:
   - Avalanche CLI subnet configuration
   - Key files in `~/.avalanche-cli/key/`
   - Subnet description output

## Supported Methods

The key loader tries multiple methods to find the funded account:

### Method 1: Subnet Describe Command
Extracts the key from `avalanche subnet describe <subnet_name> --local` output

### Method 2: Key Files
Looks for key files in `~/.avalanche-cli/key/`:
- `key.pk`
- `<subnet_name>.pk`
- `Hades.pk` (common default)
- Most recent `.pk` file

### Method 3: Subnet Configuration
Reads from subnet JSON configuration files in `~/.avalanche-cli/subnets/<subnet_name>/`

## Usage

### Automatic (Recommended)
Just ensure your Avalanche subnet is configured:

```bash
# No PRIVATE_KEY needed in .env!
python3 scripts/manage_contracts.py status
python3 scripts/manage_contracts.py deploy
```

The system will automatically:
1. Detect your subnet (default: ChaosStarNetwork)
2. Find the funded account key
3. Display the account address and balance
4. Use it for all contract operations

### Manual Override
If you want to use a different account:

```env
# .env
PRIVATE_KEY=0x...your_custom_key...
```

The manual key takes precedence over auto-loading.

### Custom Subnet Name
To use a different subnet:

```env
# .env
AVALANCHE_SUBNET_NAME=Nether
```

## Verification

When the key is auto-loaded, you'll see:

```
✓ Found funded account: 0x7852031cbD4b980457962D30D11e7CC684109fEa (balance: 1798838483000000000 wei)
✓ Automatically loaded private key from Avalanche CLI (ChaosStarNetwork)
  Account: 0x7852031cbD4b980457962D30D11e7CC684109fEa
```

## Testing

Test the key loader directly:

```bash
python3 backend/avalanche_key_loader.py
```

## Benefits

- ✅ No need to manually copy/paste private keys
- ✅ Automatically uses the funded account from your subnet
- ✅ Secure - keys stay in Avalanche CLI's secure storage
- ✅ Works with multiple subnets via `AVALANCHE_SUBNET_NAME`
- ✅ Falls back gracefully if key not found

## Troubleshooting

### Key Not Found
If auto-loading fails:
1. Check that your subnet is configured: `avalanche subnet list`
2. Verify key files exist: `ls ~/.avalanche-cli/key/`
3. Manually set `PRIVATE_KEY` in `.env` as fallback

### Wrong Account
If the wrong account is loaded:
1. Set `PRIVATE_KEY` in `.env` to override
2. Or specify a different key file name

### Import Errors
If you see import errors:
- Ensure you're running from the project root
- Check that `backend/avalanche_key_loader.py` exists
- Python path should include the project directory

## Security Notes

- Private keys are never logged or exposed
- Keys are read directly from Avalanche CLI's secure storage
- Manual keys in `.env` are not committed to git (see `.gitignore`)
- Always verify the account address displayed is correct


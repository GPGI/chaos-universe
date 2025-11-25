# Contract Deployment Status on Chaos Star Network

**Network:** Chaos Star Network  
**RPC URL:** `http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc`  
**Deployer:** `0x7852031cbD4b980457962D30D11e7CC684109fEa`

## Successfully Deployed Contracts

1. **SaraktDigitalID**
   - Address: `0x91DaA2357C811De79208Ba95b85A974773FEeA10`
   - Transaction: `0xcef729ffffb1885a6e84b575586802aecff4f9a3754fae00b685a1be3d373d31`
   - Status: ✅ Deployed

2. **PlotRegistry1155**
   - Address: `0xa87734539172e23d0aE71E0C92a192b332dad5E9`
   - Transaction: `0x629301e05a32d1d7cd255496661d78246af322b3f8cc64efcf092cd1882b8907`
   - Status: ✅ Deployed

## Contracts to Deploy

The following contracts need to be deployed (deterministic addresses from simulation):

3. **DummyToken**
   - Expected Address: `0xa87734539172e23d0aE71E0C92a192b332dad5E9`
   - Constructor Args: `("Sarakt Token", "SAR")`
   - Status: ⏳ Pending

4. **SaraktTreasury**
   - Expected Address: `0xD766189faA731C22b8543a2f9b34b79C6A8D4175`
   - Constructor Args: `[0xa87734539172e23d0aE71E0C92a192b332dad5E9]` (DummyToken address)
   - Status: ⏳ Pending

5. **SaraktLandV2**
   - Expected Address: `0xdBb5d3C37A3f4d8a8A23771631F122353F432b74`
   - Constructor Args: `(0xD766189faA731C22b8543a2f9b34b79C6A8D4175, 0x91DaA2357C811De79208Ba95b85A974773FEeA10)`
   - Status: ⏳ Pending

## Note

StarSystem, Planet, and City contracts are deployed on-demand when star systems, planets, and cities are created via Celestial Forge. They are not deployed as part of the initial deployment.

## Next Steps

To complete the deployment, ensure the Chaos Star Network node is running and accessible, then deploy the remaining contracts in order:
1. DummyToken
2. SaraktTreasury (depends on DummyToken)
3. SaraktLandV2 (depends on Treasury and DigitalID)


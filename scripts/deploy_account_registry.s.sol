// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AccountRegistry} from "../src/contracts/AccountRegistry.sol";

contract DeployAccountRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying AccountRegistry with account:", deployer);
        console.log("Account balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy AccountRegistry
        console.log("\n=== Deploying AccountRegistry ===");
        AccountRegistry accountRegistry = new AccountRegistry();
        address registryAddress = address(accountRegistry);
        console.log("AccountRegistry deployed at:", registryAddress);
        
        vm.stopBroadcast();
        
        // Address is logged - file saving handled by Python script
        // _saveAddress(registryAddress);
    }
    
    function _saveAddress(address registryAddress) internal {
        // Use absolute path for Foundry file operations
        string memory addressesPath = string(abi.encodePacked(vm.projectRoot(), "/deployments/addresses.json"));
        
        // Read existing addresses if file exists
        string memory existingJson = "";
        try vm.readFile(addressesPath) returns (string memory fileJson) {
            existingJson = fileJson;
        } catch {
            // File doesn't exist, start fresh
        }
        
        // Parse existing JSON or create new
        string memory json;
        if (bytes(existingJson).length > 0) {
            // Update existing JSON
            // Simple approach: append accountRegistry to the JSON
            // Remove closing brace and add accountRegistry
            string memory withoutClosing = _removeTrailingBrace(existingJson);
            json = string(abi.encodePacked(
                withoutClosing,
                ',\n  "accountRegistry": "', _addressToString(registryAddress), '"\n',
                "}\n"
            ));
        } else {
            // Create new JSON
            json = string(abi.encodePacked(
                "{\n",
                '  "accountRegistry": "', _addressToString(registryAddress), '"\n',
                "}\n"
            ));
        }
        
        vm.writeFile(addressesPath, json);
        console.log("\nAddress saved to deployments/addresses.json");
        console.log("AccountRegistry:", _addressToString(registryAddress));
    }
    
    function _removeTrailingBrace(string memory json) internal pure returns (string memory) {
        bytes memory jsonBytes = bytes(json);
        uint256 len = jsonBytes.length;
        
        // Find the last closing brace and remove it and any trailing whitespace
        uint256 end = len;
        for (uint256 i = len; i > 0; i--) {
            if (jsonBytes[i - 1] == '}') {
                end = i - 1;
                break;
            }
            if (jsonBytes[i - 1] != ' ' && jsonBytes[i - 1] != '\n' && jsonBytes[i - 1] != '\t' && jsonBytes[i - 1] != '\r') {
                break;
            }
        }
        
        // Remove trailing whitespace before the brace
        while (end > 0 && (jsonBytes[end - 1] == ' ' || jsonBytes[end - 1] == '\n' || jsonBytes[end - 1] == '\t' || jsonBytes[end - 1] == '\r')) {
            end--;
        }
        
        bytes memory result = new bytes(end);
        for (uint256 i = 0; i < end; i++) {
            result[i] = jsonBytes[i];
        }
        return string(result);
    }
    
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}


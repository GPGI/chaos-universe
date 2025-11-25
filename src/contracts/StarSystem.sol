// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StarSystem
 * @notice Represents an Avalanche subnet (Star System) on-chain
 * @dev Manages star system metadata, treasury, and planet registry
 */
contract StarSystem is Ownable, ReentrancyGuard {
    struct StarSystemData {
        string name;
        string subnetId;
        address owner;
        string rpcUrl;
        uint256 chainId;
        uint256 tributePercent; // Percentage tribute to Sarakt (0-100)
        uint256 nativeBalance; // Native CSN balance
        bool active;
        uint256 createdAt;
    }

    StarSystemData public systemData;
    address[] public planets;
    mapping(address => bool) public isPlanet;
    mapping(address => uint256) public planetIndex;

    event PlanetAdded(address indexed planet, string name);
    event PlanetRemoved(address indexed planet);
    event TributeUpdated(uint256 oldPercent, uint256 newPercent);
    event SystemActivated();
    event SystemDeactivated();
    event NativeBalanceUpdated(uint256 balance);

    constructor(
        string memory _name,
        string memory _subnetId,
        address _owner,
        string memory _rpcUrl,
        uint256 _chainId,
        uint256 _tributePercent
    ) Ownable(_owner) {
        require(bytes(_name).length > 0, "Name required");
        require(_owner != address(0), "Invalid owner");
        require(_tributePercent <= 100, "Tribute > 100%");

        systemData = StarSystemData({
            name: _name,
            subnetId: _subnetId,
            owner: _owner,
            rpcUrl: _rpcUrl,
            chainId: _chainId,
            tributePercent: _tributePercent,
            nativeBalance: 0,
            active: true,
            createdAt: block.timestamp
        });
    }

    /**
     * @notice Add a planet to this star system
     * @param planetAddress Address of the Planet contract
     */
    function addPlanet(address planetAddress) external onlyOwner {
        require(planetAddress != address(0), "Invalid planet");
        require(!isPlanet[planetAddress], "Planet already added");

        planets.push(planetAddress);
        isPlanet[planetAddress] = true;
        planetIndex[planetAddress] = planets.length - 1;

        emit PlanetAdded(planetAddress, "");
    }

    /**
     * @notice Remove a planet from this star system
     * @param planetAddress Address of the Planet contract
     */
    function removePlanet(address planetAddress) external onlyOwner {
        require(isPlanet[planetAddress], "Planet not found");

        uint256 index = planetIndex[planetAddress];
        uint256 lastIndex = planets.length - 1;

        if (index != lastIndex) {
            planets[index] = planets[lastIndex];
            planetIndex[planets[index]] = index;
        }

        planets.pop();
        delete isPlanet[planetAddress];
        delete planetIndex[planetAddress];

        emit PlanetRemoved(planetAddress);
    }

    /**
     * @notice Update tribute percentage
     * @param newTributePercent New tribute percentage (0-100)
     */
    function setTributePercent(uint256 newTributePercent) external onlyOwner {
        require(newTributePercent <= 100, "Tribute > 100%");
        uint256 oldPercent = systemData.tributePercent;
        systemData.tributePercent = newTributePercent;
        emit TributeUpdated(oldPercent, newTributePercent);
    }

    /**
     * @notice Activate the star system
     */
    function activate() external onlyOwner {
        systemData.active = true;
        emit SystemActivated();
    }

    /**
     * @notice Deactivate the star system
     */
    function deactivate() external onlyOwner {
        systemData.active = false;
        emit SystemDeactivated();
    }

    /**
     * @notice Update native balance (called by backend/off-chain)
     * @param balance New native CSN balance
     */
    function updateNativeBalance(uint256 balance) external onlyOwner {
        systemData.nativeBalance = balance;
        emit NativeBalanceUpdated(balance);
    }

    /**
     * @notice Get all planets in this star system
     * @return Array of planet addresses
     */
    function getPlanets() external view returns (address[] memory) {
        return planets;
    }

    /**
     * @notice Get number of planets
     * @return Count of planets
     */
    function planetCount() external view returns (uint256) {
        return planets.length;
    }

    /**
     * @notice Receive native CSN
     */
    receive() external payable {
        systemData.nativeBalance += msg.value;
        emit NativeBalanceUpdated(systemData.nativeBalance);
    }

    /**
     * @notice Withdraw native CSN (only owner)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount <= systemData.nativeBalance, "Insufficient balance");
        
        systemData.nativeBalance -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit NativeBalanceUpdated(systemData.nativeBalance);
    }
}


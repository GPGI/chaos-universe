// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Planet
 * @notice Represents a validator node/planet on-chain
 * @dev Manages planet metadata, cities, and native CSN balance
 */
contract Planet is Ownable, ReentrancyGuard {
    enum PlanetType {
        Habitable,
        Resource,
        Research,
        Military
    }

    enum NodeType {
        Master,
        Validator
    }

    struct PlanetData {
        string name;
        address starSystem; // Address of StarSystem contract
        address owner;
        PlanetType planetType;
        NodeType nodeType;
        string nodeId;
        string ipAddress;
        uint256 nativeBalance; // Native CSN balance
        bool active;
        uint256 createdAt;
    }

    PlanetData public planetData;
    address[] public cities;
    mapping(address => bool) public isCity;
    mapping(address => uint256) public cityIndex;

    event CityAdded(address indexed city, string name);
    event CityRemoved(address indexed city);
    event PlanetActivated();
    event PlanetDeactivated();
    event NativeBalanceUpdated(uint256 balance);
    event PlanetTypeUpdated(PlanetType newType);

    constructor(
        string memory _name,
        address _starSystem,
        address _owner,
        PlanetType _planetType,
        NodeType _nodeType,
        string memory _nodeId,
        string memory _ipAddress
    ) Ownable(_owner) {
        require(bytes(_name).length > 0, "Name required");
        require(_starSystem != address(0), "Invalid star system");
        require(_owner != address(0), "Invalid owner");

        planetData = PlanetData({
            name: _name,
            starSystem: _starSystem,
            owner: _owner,
            planetType: _planetType,
            nodeType: _nodeType,
            nodeId: _nodeId,
            ipAddress: _ipAddress,
            nativeBalance: 0,
            active: true,
            createdAt: block.timestamp
        });
    }

    /**
     * @notice Add a city to this planet
     * @param cityAddress Address of the City contract
     */
    function addCity(address cityAddress) external onlyOwner {
        require(cityAddress != address(0), "Invalid city");
        require(!isCity[cityAddress], "City already added");

        cities.push(cityAddress);
        isCity[cityAddress] = true;
        cityIndex[cityAddress] = cities.length - 1;

        emit CityAdded(cityAddress, "");
    }

    /**
     * @notice Remove a city from this planet
     * @param cityAddress Address of the City contract
     */
    function removeCity(address cityAddress) external onlyOwner {
        require(isCity[cityAddress], "City not found");

        uint256 index = cityIndex[cityAddress];
        uint256 lastIndex = cities.length - 1;

        if (index != lastIndex) {
            cities[index] = cities[lastIndex];
            cityIndex[cities[index]] = index;
        }

        cities.pop();
        delete isCity[cityAddress];
        delete cityIndex[cityAddress];

        emit CityRemoved(cityAddress);
    }

    /**
     * @notice Update planet type
     * @param newType New planet type
     */
    function setPlanetType(PlanetType newType) external onlyOwner {
        planetData.planetType = newType;
        emit PlanetTypeUpdated(newType);
    }

    /**
     * @notice Activate the planet
     */
    function activate() external onlyOwner {
        planetData.active = true;
        emit PlanetActivated();
    }

    /**
     * @notice Deactivate the planet
     */
    function deactivate() external onlyOwner {
        planetData.active = false;
        emit PlanetDeactivated();
    }

    /**
     * @notice Update native balance (called by backend/off-chain)
     * @param balance New native CSN balance
     */
    function updateNativeBalance(uint256 balance) external onlyOwner {
        planetData.nativeBalance = balance;
        emit NativeBalanceUpdated(balance);
    }

    /**
     * @notice Get all cities on this planet
     * @return Array of city addresses
     */
    function getCities() external view returns (address[] memory) {
        return cities;
    }

    /**
     * @notice Get number of cities
     * @return Count of cities
     */
    function cityCount() external view returns (uint256) {
        return cities.length;
    }

    /**
     * @notice Receive native CSN
     */
    receive() external payable {
        planetData.nativeBalance += msg.value;
        emit NativeBalanceUpdated(planetData.nativeBalance);
    }

    /**
     * @notice Withdraw native CSN (only owner)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount <= planetData.nativeBalance, "Insufficient balance");
        
        planetData.nativeBalance -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit NativeBalanceUpdated(planetData.nativeBalance);
    }
}


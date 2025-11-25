// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title City
 * @notice Represents a city on a planet on-chain
 * @dev Manages city metadata, population, and native CSN balance
 */
contract City is Ownable, ReentrancyGuard {
    struct CityData {
        string name;
        address planet; // Address of Planet contract
        address owner;
        uint256 population;
        uint256 nativeBalance; // Native CSN balance
        string metadataURI; // IPFS or other metadata URI
        bool active;
        uint256 createdAt;
    }

    CityData public cityData;

    // City zones/plots (references to land plots)
    uint256[] public plots;
    mapping(uint256 => bool) public isPlot;
    mapping(uint256 => uint256) public plotIndex;

    event PlotAdded(uint256 indexed plotId);
    event PlotRemoved(uint256 indexed plotId);
    event PopulationUpdated(uint256 oldPopulation, uint256 newPopulation);
    event CityActivated();
    event CityDeactivated();
    event NativeBalanceUpdated(uint256 balance);
    event MetadataURIUpdated(string newURI);

    constructor(
        string memory _name,
        address _planet,
        address _owner,
        string memory _metadataURI
    ) Ownable(_owner) {
        require(bytes(_name).length > 0, "Name required");
        require(_planet != address(0), "Invalid planet");
        require(_owner != address(0), "Invalid owner");

        cityData = CityData({
            name: _name,
            planet: _planet,
            owner: _owner,
            population: 0,
            nativeBalance: 0,
            metadataURI: _metadataURI,
            active: true,
            createdAt: block.timestamp
        });
    }

    /**
     * @notice Add a plot to this city
     * @param plotId Land plot ID
     */
    function addPlot(uint256 plotId) external onlyOwner {
        require(!isPlot[plotId], "Plot already added");

        plots.push(plotId);
        isPlot[plotId] = true;
        plotIndex[plotId] = plots.length - 1;

        emit PlotAdded(plotId);
    }

    /**
     * @notice Remove a plot from this city
     * @param plotId Land plot ID
     */
    function removePlot(uint256 plotId) external onlyOwner {
        require(isPlot[plotId], "Plot not found");

        uint256 index = plotIndex[plotId];
        uint256 lastIndex = plots.length - 1;

        if (index != lastIndex) {
            plots[index] = plots[lastIndex];
            plotIndex[plots[index]] = index;
        }

        plots.pop();
        delete isPlot[plotId];
        delete plotIndex[plotId];

        emit PlotRemoved(plotId);
    }

    /**
     * @notice Update city population
     * @param newPopulation New population count
     */
    function setPopulation(uint256 newPopulation) external onlyOwner {
        uint256 oldPopulation = cityData.population;
        cityData.population = newPopulation;
        emit PopulationUpdated(oldPopulation, newPopulation);
    }

    /**
     * @notice Update metadata URI
     * @param newURI New metadata URI
     */
    function setMetadataURI(string memory newURI) external onlyOwner {
        cityData.metadataURI = newURI;
        emit MetadataURIUpdated(newURI);
    }

    /**
     * @notice Activate the city
     */
    function activate() external onlyOwner {
        cityData.active = true;
        emit CityActivated();
    }

    /**
     * @notice Deactivate the city
     */
    function deactivate() external onlyOwner {
        cityData.active = false;
        emit CityDeactivated();
    }

    /**
     * @notice Update native balance (called by backend/off-chain)
     * @param balance New native CSN balance
     */
    function updateNativeBalance(uint256 balance) external onlyOwner {
        cityData.nativeBalance = balance;
        emit NativeBalanceUpdated(balance);
    }

    /**
     * @notice Get all plots in this city
     * @return Array of plot IDs
     */
    function getPlots() external view returns (uint256[] memory) {
        return plots;
    }

    /**
     * @notice Get number of plots
     * @return Count of plots
     */
    function plotCount() external view returns (uint256) {
        return plots.length;
    }

    /**
     * @notice Receive native CSN
     */
    receive() external payable {
        cityData.nativeBalance += msg.value;
        emit NativeBalanceUpdated(cityData.nativeBalance);
    }

    /**
     * @notice Withdraw native CSN (only owner)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount <= cityData.nativeBalance, "Insufficient balance");
        
        cityData.nativeBalance -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit NativeBalanceUpdated(cityData.nativeBalance);
    }
}


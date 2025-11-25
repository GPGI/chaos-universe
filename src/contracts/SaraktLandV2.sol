// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface ITreasury {
    function depositERC20(address token, uint256 amount) external;
    receive() external payable;
}

interface IDigitalID {
    function ids(address user) external view returns (
        string memory username, string memory emailHash, uint256 registeredAt, bool active
    );
}

contract SaraktLandV2 is ERC1155, Ownable, ReentrancyGuard {
    uint256 public constant TOTAL_PLOTS = 10000;
    uint256 public plotsSold = 0;
    uint256 public priceInAVAX = 0.5 ether; // legacy price (kept for compatibility)
    uint256 public phase1PriceAVAX = 0.5 ether; // admin-settable
    uint256 public phase1PriceUSDC = 0; // admin-settable (6 decimals typical)

    ITreasury public treasury;
    IDigitalID public digitalID;
    bool public salesActive = false;
    bool public requireDigitalID = false; // Phase 1: optional ID requirement

    mapping(uint256 => bool) public plotMinted;
    mapping(uint256 => address) public pendingBuyer; // plotId => buyer (pending activation)

    // Phase 1 routing addresses (simple split)
    address payable public reserveTreasury;      // receives 33%
    address payable public operationalTreasury;  // receives 67%
    address public usdcToken;                    // ERC20 for USDC on subnet

    event LandMinted(
        uint256 indexed plotId,
        address indexed owner,
        uint256 pricePaid,
        bool coldWallet,
        uint256 timestamp
    );

    event PlotPurchasePending(
        uint256 indexed plotId,
        address indexed buyer,
        uint256 amount,
        address paymentToken, // address(0) for AVAX
        uint256 timestamp
    );

    constructor(
        address _treasury,
        address _digitalID
    ) ERC1155("ipfs://QmSarakt/{id}.json") Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_digitalID != address(0), "Invalid digitalID");
        treasury = ITreasury(payable(_treasury));
        digitalID = IDigitalID(_digitalID);
        // Default phase 1 wallets: start as owner; must be set via setters
        reserveTreasury = payable(msg.sender);
        operationalTreasury = payable(msg.sender);
    }

    function buyPlot(uint256 plotId) external payable nonReentrant {
        _buy(plotId, msg.sender, false, msg.value, true);
    }
    function buyPlotsBatch(uint256[] calldata plotIds) external payable nonReentrant {
    require(salesActive, "Sales not active");
    require(plotIds.length > 0, "No plots selected");
    
    uint256 totalPrice = priceInAVAX * plotIds.length;
    require(msg.value >= totalPrice, "Insufficient AVAX");

    (, , , bool active) = digitalID.ids(msg.sender);
    require(active, "Digital ID required");

    for (uint i = 0; i < plotIds.length; i++) {
        uint256 plotId = plotIds[i];
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already sold");

        plotMinted[plotId] = true;
        plotsSold++;
        _mint(msg.sender, plotId, 1, "");
        emit LandMinted(plotId, msg.sender, priceInAVAX, false, block.timestamp);
    }

    // Refund excess AVAX
    uint256 excess = msg.value - totalPrice;
    if (excess > 0) {
        (bool refunded, ) = msg.sender.call{value: excess}("");
        require(refunded, "Refund failed");
    }

    // Transfer payment to treasury
    (bool success, ) = address(treasury).call{value: totalPrice}("");
    require(success, "Treasury deposit failed");   
    }



    function buyPlotForCold(uint256 plotId, address coldWallet) external payable nonReentrant {
        require(coldWallet != address(0), "Invalid cold wallet");
        _buy(plotId, coldWallet, true, msg.value, true);
    }

    function buyPlotERC20(uint256 plotId, address token, uint256 amount, address recipient) external nonReentrant {
        require(salesActive, "Sales not active");
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already sold");
        require(amount > 0, "Amount > 0");

        (, , , bool active) = digitalID.ids(msg.sender);
        require(active, "Digital ID required");

        plotMinted[plotId] = true;
        plotsSold++;
        _mint(recipient, plotId, 1, "");

        treasury.depositERC20(token, amount);

        emit LandMinted(plotId, recipient, amount, false, block.timestamp);
    }

    function _buy(uint256 plotId, address recipient, bool coldWallet, uint256 value, bool requireID) internal {
        require(salesActive, "Sales not active");
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already sold");
        if (requireID) {
            (, , , bool active) = digitalID.ids(msg.sender);
            require(active, "Digital ID required");
        }

        plotMinted[plotId] = true;
        plotsSold++;
        _mint(recipient, plotId, 1, "");

        (bool success, ) = address(treasury).call{value: value}("");
        require(success, "Treasury deposit failed");

        emit LandMinted(plotId, recipient, value, coldWallet, block.timestamp);
    }

    // ===== Phase 1 Minimal Payment Flow (Pending Activation + Split) =====
    function buyPlotWithAVAX(uint256 plotId) external payable nonReentrant {
        require(salesActive, "Sales not active");
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already sold");
        require(pendingBuyer[plotId] == address(0), "Activation pending");
        if (requireDigitalID) {
            (, , , bool active) = digitalID.ids(msg.sender);
            require(active, "Digital ID required");
        }
        require(phase1PriceAVAX > 0, "Price not set");
        require(msg.value >= phase1PriceAVAX, "Insufficient AVAX");

        uint256 excess = msg.value - phase1PriceAVAX;
        if (excess > 0) {
            (bool refunded, ) = msg.sender.call{value: excess}("");
            require(refunded, "Refund failed");
        }

        uint256 reserveAmount = (phase1PriceAVAX * 33) / 100;
        uint256 operationalAmount = phase1PriceAVAX - reserveAmount;

        require(reserveTreasury != address(0) && operationalTreasury != address(0), "Treasury not set");

        (bool s1, ) = reserveTreasury.call{value: reserveAmount}("");
        require(s1, "Reserve transfer failed");
        (bool s2, ) = operationalTreasury.call{value: operationalAmount}("");
        require(s2, "Operational transfer failed");

        pendingBuyer[plotId] = msg.sender;
        emit PlotPurchasePending(plotId, msg.sender, phase1PriceAVAX, address(0), block.timestamp);
    }

    function buyPlotWithUSDC(uint256 plotId, uint256 amount) external nonReentrant {
        require(salesActive, "Sales not active");
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already sold");
        require(pendingBuyer[plotId] == address(0), "Activation pending");
        if (requireDigitalID) {
            (, , , bool active) = digitalID.ids(msg.sender);
            require(active, "Digital ID required");
        }
        require(usdcToken != address(0), "USDC not set");
        require(phase1PriceUSDC > 0, "USDC price not set");
        require(amount >= phase1PriceUSDC, "Insufficient USDC");

        // Pull funds from buyer
        IERC20(usdcToken).transferFrom(msg.sender, address(this), amount);

        uint256 reserveAmount = (phase1PriceUSDC * 33) / 100;
        uint256 operationalAmount = phase1PriceUSDC - reserveAmount;

        require(reserveTreasury != address(0) && operationalTreasury != address(0), "Treasury not set");

        IERC20(usdcToken).transfer(reserveTreasury, reserveAmount);
        IERC20(usdcToken).transfer(operationalTreasury, operationalAmount);

        // Return any excess USDC back to buyer (if they sent more than price)
        uint256 excess = amount - phase1PriceUSDC;
        if (excess > 0) {
            IERC20(usdcToken).transfer(msg.sender, excess);
        }

        pendingBuyer[plotId] = msg.sender;
        emit PlotPurchasePending(plotId, msg.sender, phase1PriceUSDC, usdcToken, block.timestamp);
    }

    function activatePlot(uint256 plotId, address recipient) external onlyOwner nonReentrant {
        require(plotId > 0 && plotId <= TOTAL_PLOTS, "Invalid plot");
        require(!plotMinted[plotId], "Already minted");
        address buyer = pendingBuyer[plotId];
        require(buyer != address(0) || recipient != address(0), "No pending buyer");

        address finalRecipient = recipient != address(0) ? recipient : buyer;
        plotMinted[plotId] = true;
        pendingBuyer[plotId] = address(0);
        plotsSold++;
        _mint(finalRecipient, plotId, 1, "");
        emit LandMinted(plotId, finalRecipient, 0, false, block.timestamp);
    }

    // ===== Admin Setters =====
    function setPhase1Prices(uint256 avaxWei, uint256 usdcAmount) external onlyOwner {
        phase1PriceAVAX = avaxWei;
        phase1PriceUSDC = usdcAmount;
    }

    function setTreasuryRouting(address payable reserveAddr, address payable operationalAddr) external onlyOwner {
        require(reserveAddr != address(0) && operationalAddr != address(0), "Invalid addresses");
        reserveTreasury = reserveAddr;
        operationalTreasury = operationalAddr;
    }

    function setUSDC(address token) external onlyOwner {
        usdcToken = token;
    }

    function setRequireDigitalID(bool requireID) external onlyOwner {
        requireDigitalID = requireID;
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        priceInAVAX = newPrice;
    }

    function toggleSales(bool active) external onlyOwner {
        salesActive = active;
    }

    function plotsRemaining() external view returns (uint256) {
        return TOTAL_PLOTS - plotsSold;
    }
}

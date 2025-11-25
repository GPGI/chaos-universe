// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";

contract FractionalAsset is ERC20, Ownable {
    address public assetContract;
    uint256 public assetId;
    uint256 public totalShares;

    mapping(address => uint256) public claimedAVAX;
    mapping(address => mapping(address => uint256)) public claimedERC20;
    uint256 public totalDistributedAVAX;
    mapping(address => uint256) public totalDistributedERC20;

    event Distribution(address indexed token, uint256 totalAmount);

    constructor(
        string memory name_,
        string memory symbol_,
        address _assetContract,
        uint256 _assetId,
        uint256 _totalShares,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(_assetContract != address(0), "Invalid asset");
        require(_totalShares > 0, "Shares > 0");

        assetContract = _assetContract;
        assetId = _assetId;
        totalShares = _totalShares;

        _mint(owner_, _totalShares);
    }

    // Distribute AVAX to shareholders
    function distributeAVAX() external payable onlyOwner {
        require(msg.value > 0, "No AVAX sent");
        totalDistributedAVAX += msg.value;
        emit Distribution(address(0), msg.value);
    }

    function claimAVAX() external {
        uint256 owed = (totalDistributedAVAX * balanceOf(msg.sender)) / totalSupply() - claimedAVAX[msg.sender];
        require(owed > 0, "Nothing to claim");
        claimedAVAX[msg.sender] += owed;
        payable(msg.sender).transfer(owed);
    }

    // Distribute ERC20 token
    function distributeERC20(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount > 0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        totalDistributedERC20[token] += amount;
        emit Distribution(token, amount);
    }

    function claimERC20(address token) external {
        uint256 owed = (totalDistributedERC20[token] * balanceOf(msg.sender)) / totalSupply() - claimedERC20[token][msg.sender];
        require(owed > 0, "Nothing to claim");
        claimedERC20[token][msg.sender] += owed;
        IERC20(token).transfer(msg.sender, owed);
    }
}

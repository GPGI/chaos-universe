// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract SaraktTreasury is Ownable {
    mapping(address => bool) public supportedTokens;

    event DepositAVAX(address indexed from, uint256 amount);
    event DepositERC20(address indexed from, address indexed token, uint256 amount);
    event WithdrawalAVAX(address indexed to, uint256 amount);
    event WithdrawalERC20(address indexed to, address indexed token, uint256 amount);

    constructor(address[] memory _tokens) Ownable(msg.sender) {
        for (uint i = 0; i < _tokens.length; i++) {
            supportedTokens[_tokens[i]] = true;
        }
    }

    receive() external payable {
        emit DepositAVAX(msg.sender, msg.value);
    }

    function depositERC20(address token, uint256 amount) external {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount > 0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit DepositERC20(msg.sender, token, amount);
    }

    function withdrawAVAX(address payable to, uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient AVAX");
        (bool success, ) = to.call{value: amount}("");
        require(success, "AVAX withdrawal failed");
        emit WithdrawalAVAX(to, amount);
    }

    function withdrawERC20(address token, address to, uint256 amount) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        IERC20(token).transfer(to, amount);
        emit WithdrawalERC20(to, token, amount);
    }

    function balanceAVAX() external view returns (uint256) {
        return address(this).balance;
    }

    function balanceERC20(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}

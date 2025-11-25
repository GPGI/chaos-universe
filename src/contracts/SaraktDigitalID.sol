// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract SaraktDigitalID is Ownable {
    constructor() Ownable(msg.sender) {}
    struct DigitalID {
        string firstName;
        string lastName;
        string email;       // plain email to receive documents
        string avatarURI;   // avatar image URI (e.g., ipfs://...)
        uint256 registeredAt;
        bool active;
    }

    mapping(address => DigitalID) public ids;

    event IDRegistered(address indexed user, string firstName, string lastName, uint256 timestamp);
    event IDDeactivated(address indexed user, uint256 timestamp);

    function registerID(
        string memory firstName,
        string memory lastName,
        string memory email,
        string memory avatarURI
    ) external {
        require(bytes(firstName).length > 0, "First name required");
        require(bytes(lastName).length > 0, "Last name required");
        require(bytes(email).length > 0, "Email required");
        require(!ids[msg.sender].active, "ID exists");

        ids[msg.sender] = DigitalID({
            firstName: firstName,
            lastName: lastName,
            email: email,
            avatarURI: avatarURI,
            registeredAt: block.timestamp,
            active: true
        });

        emit IDRegistered(msg.sender, firstName, lastName, block.timestamp);
    }

    function deactivateID() external {
        require(ids[msg.sender].active, "ID not active");
        ids[msg.sender].active = false;
        emit IDDeactivated(msg.sender, block.timestamp);
    }

    function getID(address user) external view returns (DigitalID memory) {
        require(ids[user].active, "ID not active");
        return ids[user];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AccountRegistry
 * @notice On-chain registry for managing accounts and their relationships
 * @dev Accounts can be personal, cluster, joint, business, or sub-accounts
 */
contract AccountRegistry is Ownable, ReentrancyGuard {
    enum AccountType {
        Personal,
        Cluster,
        Joint,
        Business,
        Sub
    }

    struct Account {
        uint256 id;
        string name;
        address walletAddress;
        AccountType accountType;
        address ownerWallet;
        string description;
        address parentAccount; // For sub-accounts
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Mappings
    mapping(uint256 => Account) public accounts;
    mapping(address => uint256[]) public walletToAccountIds; // Wallet can own multiple accounts
    mapping(address => uint256) public walletToPrimaryAccount; // Primary account for a wallet
    mapping(uint256 => address[]) public accountMembers; // For joint accounts
    mapping(uint256 => uint256[]) public accountChildren; // Sub-accounts
    
    // Counters
    uint256 private _accountCounter;
    
    // Events
    event AccountCreated(
        uint256 indexed accountId,
        address indexed walletAddress,
        address indexed ownerWallet,
        AccountType accountType,
        string name
    );
    
    event AccountUpdated(
        uint256 indexed accountId,
        address indexed ownerWallet,
        string name
    );
    
    event AccountDeactivated(
        uint256 indexed accountId,
        address indexed ownerWallet
    );
    
    event MemberAdded(
        uint256 indexed accountId,
        address indexed member
    );
    
    event MemberRemoved(
        uint256 indexed accountId,
        address indexed member
    );
    
    event SubAccountLinked(
        uint256 indexed parentAccountId,
        uint256 indexed childAccountId
    );
    
    event SubAccountUnlinked(
        uint256 indexed parentAccountId,
        uint256 indexed childAccountId
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new account on-chain
     * @param name Account name
     * @param walletAddress Wallet address associated with this account
     * @param accountType Type of account (Personal, Cluster, Joint, Business, Sub)
     * @param description Optional description
     * @param parentAccountId Parent account ID (0 if none, for sub-accounts)
     * @return accountId The ID of the newly created account
     */
    function createAccount(
        string memory name,
        address walletAddress,
        AccountType accountType,
        string memory description,
        uint256 parentAccountId
    ) external nonReentrant returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(walletAddress != address(0), "Invalid wallet address");
        
        // For sub-accounts, verify parent exists
        if (accountType == AccountType.Sub) {
            require(parentAccountId > 0, "Parent account required for sub-accounts");
            require(accounts[parentAccountId].isActive, "Parent account not active");
            require(
                accounts[parentAccountId].ownerWallet == msg.sender,
                "Not parent account owner"
            );
        }
        
        _accountCounter++;
        uint256 accountId = _accountCounter;
        
        accounts[accountId] = Account({
            id: accountId,
            name: name,
            walletAddress: walletAddress,
            accountType: accountType,
            ownerWallet: msg.sender,
            description: description,
            parentAccount: parentAccountId > 0 ? accounts[parentAccountId].walletAddress : address(0),
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        // Link wallet to account
        walletToAccountIds[walletAddress].push(accountId);
        
        // Set as primary if first account for this wallet
        if (walletToPrimaryAccount[walletAddress] == 0) {
            walletToPrimaryAccount[walletAddress] = accountId;
        }
        
        // Link sub-account to parent
        if (parentAccountId > 0) {
            accountChildren[parentAccountId].push(accountId);
        }
        
        emit AccountCreated(accountId, walletAddress, msg.sender, accountType, name);
        
        return accountId;
    }

    /**
     * @notice Update account information
     * @param accountId Account ID to update
     * @param name New name (empty to keep current)
     * @param description New description (empty to keep current)
     */
    function updateAccount(
        uint256 accountId,
        string memory name,
        string memory description
    ) external {
        require(accounts[accountId].id > 0, "Account not found");
        require(accounts[accountId].ownerWallet == msg.sender, "Not account owner");
        require(accounts[accountId].isActive, "Account not active");
        
        if (bytes(name).length > 0) {
            accounts[accountId].name = name;
        }
        if (bytes(description).length > 0) {
            accounts[accountId].description = description;
        }
        accounts[accountId].updatedAt = block.timestamp;
        
        emit AccountUpdated(accountId, msg.sender, accounts[accountId].name);
    }

    /**
     * @notice Deactivate an account
     * @param accountId Account ID to deactivate
     */
    function deactivateAccount(uint256 accountId) external {
        require(accounts[accountId].id > 0, "Account not found");
        require(accounts[accountId].ownerWallet == msg.sender, "Not account owner");
        
        accounts[accountId].isActive = false;
        accounts[accountId].updatedAt = block.timestamp;
        
        emit AccountDeactivated(accountId, msg.sender);
    }

    /**
     * @notice Add a member to a joint account
     * @param accountId Joint account ID
     * @param member Member wallet address
     */
    function addJointMember(uint256 accountId, address member) external {
        require(accounts[accountId].id > 0, "Account not found");
        require(accounts[accountId].accountType == AccountType.Joint, "Not a joint account");
        require(accounts[accountId].ownerWallet == msg.sender, "Not account owner");
        require(member != address(0), "Invalid member address");
        
        // Check if member already exists
        for (uint256 i = 0; i < accountMembers[accountId].length; i++) {
            require(accountMembers[accountId][i] != member, "Member already exists");
        }
        
        accountMembers[accountId].push(member);
        emit MemberAdded(accountId, member);
    }

    /**
     * @notice Remove a member from a joint account
     * @param accountId Joint account ID
     * @param member Member wallet address to remove
     */
    function removeJointMember(uint256 accountId, address member) external {
        require(accounts[accountId].id > 0, "Account not found");
        require(accounts[accountId].ownerWallet == msg.sender, "Not account owner");
        
        uint256 memberCount = accountMembers[accountId].length;
        for (uint256 i = 0; i < memberCount; i++) {
            if (accountMembers[accountId][i] == member) {
                accountMembers[accountId][i] = accountMembers[accountId][memberCount - 1];
                accountMembers[accountId].pop();
                emit MemberRemoved(accountId, member);
                return;
            }
        }
        revert("Member not found");
    }

    /**
     * @notice Link a sub-account to a parent account
     * @param parentAccountId Parent account ID
     * @param childAccountId Child account ID
     */
    function linkSubAccount(uint256 parentAccountId, uint256 childAccountId) external {
        require(accounts[parentAccountId].id > 0, "Parent account not found");
        require(accounts[childAccountId].id > 0, "Child account not found");
        require(accounts[parentAccountId].ownerWallet == msg.sender, "Not parent owner");
        require(accounts[childAccountId].accountType == AccountType.Sub, "Not a sub-account");
        
        // Check if already linked
        for (uint256 i = 0; i < accountChildren[parentAccountId].length; i++) {
            require(accountChildren[parentAccountId][i] != childAccountId, "Already linked");
        }
        
        accountChildren[parentAccountId].push(childAccountId);
        accounts[childAccountId].parentAccount = accounts[parentAccountId].walletAddress;
        
        emit SubAccountLinked(parentAccountId, childAccountId);
    }

    /**
     * @notice Unlink a sub-account from its parent
     * @param parentAccountId Parent account ID
     * @param childAccountId Child account ID
     */
    function unlinkSubAccount(uint256 parentAccountId, uint256 childAccountId) external {
        require(accounts[parentAccountId].id > 0, "Parent account not found");
        require(accounts[parentAccountId].ownerWallet == msg.sender, "Not parent owner");
        
        uint256 childCount = accountChildren[parentAccountId].length;
        for (uint256 i = 0; i < childCount; i++) {
            if (accountChildren[parentAccountId][i] == childAccountId) {
                accountChildren[parentAccountId][i] = accountChildren[parentAccountId][childCount - 1];
                accountChildren[parentAccountId].pop();
                accounts[childAccountId].parentAccount = address(0);
                emit SubAccountUnlinked(parentAccountId, childAccountId);
                return;
            }
        }
        revert("Sub-account not linked");
    }

    /**
     * @notice Get account details
     * @param accountId Account ID
     * @return Account struct
     */
    function getAccount(uint256 accountId) external view returns (Account memory) {
        require(accounts[accountId].id > 0, "Account not found");
        return accounts[accountId];
    }

    /**
     * @notice Get all account IDs for a wallet
     * @param wallet Wallet address
     * @return Array of account IDs
     */
    function getAccountsByWallet(address wallet) external view returns (uint256[] memory) {
        return walletToAccountIds[wallet];
    }

    /**
     * @notice Get primary account ID for a wallet
     * @param wallet Wallet address
     * @return Primary account ID (0 if none)
     */
    function getPrimaryAccount(address wallet) external view returns (uint256) {
        return walletToPrimaryAccount[wallet];
    }

    /**
     * @notice Get members of a joint account
     * @param accountId Account ID
     * @return Array of member addresses
     */
    function getAccountMembers(uint256 accountId) external view returns (address[] memory) {
        return accountMembers[accountId];
    }

    /**
     * @notice Get sub-accounts of a parent account
     * @param accountId Parent account ID
     * @return Array of sub-account IDs
     */
    function getSubAccounts(uint256 accountId) external view returns (uint256[] memory) {
        return accountChildren[accountId];
    }

    /**
     * @notice Get total number of accounts
     * @return Total account count
     */
    function totalAccounts() external view returns (uint256) {
        return _accountCounter;
    }

    /**
     * @notice Check if an address is a member of an account
     * @param accountId Account ID
     * @param member Member address to check
     * @return True if member, false otherwise
     */
    function isAccountMember(uint256 accountId, address member) external view returns (bool) {
        if (accounts[accountId].ownerWallet == member) {
            return true;
        }
        for (uint256 i = 0; i < accountMembers[accountId].length; i++) {
            if (accountMembers[accountId][i] == member) {
                return true;
            }
        }
        return false;
    }
}


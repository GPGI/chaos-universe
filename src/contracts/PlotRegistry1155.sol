// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import "lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "lib/openzeppelin-contracts/contracts/utils/Pausable.sol";

/**
 * @title PlotRegistry1155
 * @notice ERC-1155 land registry for plot IDs 1..10000, max supply 1 each.
 *         Admin/minter activates plots (mints), metadata stored per id.
 *         Owner-requested transfer workflow with admin approval.
 */
contract PlotRegistry1155 is ERC1155, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_PLOT_ID = 10000;

    // Per-plot owner, exists only when minted (supply == 1)
    mapping(uint256 => address) public ownerOfPlot;
    // Metadata URI per plot
    mapping(uint256 => string) private _uriForId;
    // Pending transfer: plotId => requested new owner
    mapping(uint256 => address) public pendingTransfer;
    // Whether plot is activated (minted)
    mapping(uint256 => bool) public activated;

    event PlotActivated(uint256 indexed plotId, address indexed owner, string uri);
    event TransferRequested(uint256 indexed plotId, address indexed from, address indexed to);
    event TransferApproved(uint256 indexed plotId, address indexed from, address indexed to);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    modifier onlyValidPlot(uint256 plotId) {
        require(plotId > 0 && plotId <= MAX_PLOT_ID, "Invalid plotId");
        _;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _uriForId[id];
    }

    /**
     * @notice Activate (mint) a plot to a wallet with a given metadata uri.
     *         Only admin or minter can call. Max supply 1 per id.
     */
    function activate(uint256 plotId, address to, string memory metadataURI)
        external
        whenNotPaused
        onlyValidPlot(plotId)
        onlyRole(MINTER_ROLE)
    {
        require(!activated[plotId], "Already activated");
        require(to != address(0), "Invalid recipient");
        activated[plotId] = true;
        _uriForId[plotId] = metadataURI;
        _mint(to, plotId, 1, "");
        emit PlotActivated(plotId, to, metadataURI);
    }

    /**
     * @notice Owner of a plot requests admin-approved transfer to newOwner.
     */
    function requestTransfer(uint256 plotId, address newOwner)
        external
        whenNotPaused
        onlyValidPlot(plotId)
    {
        require(activated[plotId], "Not activated");
        require(newOwner != address(0), "Invalid new owner");
        require(ownerOfPlot[plotId] == msg.sender, "Not plot owner");
        pendingTransfer[plotId] = newOwner;
        emit TransferRequested(plotId, msg.sender, newOwner);
    }

    /**
     * @notice Admin approves pending transfer; transfers the token to the requested newOwner.
     *         Fails if no pending request.
     */
    function adminApproveTransfer(uint256 plotId)
        external
        whenNotPaused
        onlyValidPlot(plotId)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        address currentOwner = ownerOfPlot[plotId];
        require(currentOwner != address(0), "Not owned");
        address newOwner = pendingTransfer[plotId];
        require(newOwner != address(0), "No pending transfer");

        // Clear pending first to prevent reentrancy on hooks
        pendingTransfer[plotId] = address(0);
        // Perform internal transfer (admin authorized)
        _safeTransferFrom(currentOwner, newOwner, plotId, 1, "");
        emit TransferApproved(plotId, currentOwner, newOwner);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
        super._update(from, to, ids, values);
        // Track owners for supply-1 tokens
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            if (values[i] == 0) continue;
            if (to == address(0)) {
                ownerOfPlot[id] = address(0);
            } else if (from != to) {
                ownerOfPlot[id] = to;
            }
        }
    }
}



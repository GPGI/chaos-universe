// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/contracts/PlotRegistry1155.sol";

contract PlotRegistry1155Test is Test {
    PlotRegistry1155 registry;
    address admin = address(0xA11CE);
    address minter = address(0xBEEF);
    address user1 = address(0x1111);
    address user2 = address(0x2222);

    function setUp() public {
        vm.prank(admin);
        registry = new PlotRegistry1155();
        // grant roles
        vm.prank(admin);
        registry.grantRole(registry.MINTER_ROLE(), minter);
    }

    function testActivateOnce() public {
        vm.prank(minter);
        registry.activate(123, user1, "ipfs://plot123");
        assertEq(registry.activated(123), true);
        assertEq(registry.balanceOf(user1, 123), 1);
        assertEq(registry.ownerOfPlot(123), user1);
        assertEq(registry.uri(123), "ipfs://plot123");

        vm.expectRevert(); // Already activated
        vm.prank(minter);
        registry.activate(123, user1, "ipfs://plot123");
    }

    function testOnlyMinterCanActivate() public {
        vm.expectRevert();
        registry.activate(1, user1, "uri");
    }

    function testRequestAndApproveTransfer() public {
        vm.prank(minter);
        registry.activate(10, user1, "ipfs://10");

        vm.prank(user1);
        registry.requestTransfer(10, user2);
        assertEq(registry.pendingTransfer(10), user2);

        vm.prank(admin);
        registry.adminApproveTransfer(10);
        assertEq(registry.balanceOf(user1, 10), 0);
        assertEq(registry.balanceOf(user2, 10), 1);
        assertEq(registry.ownerOfPlot(10), user2);
        assertEq(registry.pendingTransfer(10), address(0));
    }
}



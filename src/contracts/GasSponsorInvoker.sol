// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import { BaseAuth } from "./BaseAuth.sol";

/// @title Gas Sponsor Invoker
/// @author enitrat <https://github.com/kkrt-labs/kakarot/blob/main/experimental_contracts/src/EIP3074/GasSponsorInvoker.sol>
/// @notice Invoker contract using EIP-3074 to sponsor gas for authorized transactions
contract GasSponsorInvoker is BaseAuth {
    /// @notice Executes a call authorized by an external account (EOA)
    /// @param authority The address of the authorizing external account
    /// @param commitData A 32-byte value committing to transaction validity conditions
    /// @param v The recovery byte of the signature
    /// @param r Half of the ECDSA signature pair
    /// @param s Half of the ECDSA signature pair
    /// @param to The target contract address to call
    /// @param data The data payload for the call
    /// @return success True if the call was successful
    function sponsorCall(
        address authority,
        bytes memory commitData,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address to,
        bytes calldata data
    ) external view returns (bool success) {
        abi.decode(commitData, (uint256, uint256));

        bytes32 commit = keccak256(commitData);
        // Ensure the transaction is authorized by the signer
        require(authSimple(authority, commit, v, r, s), "Authorization failed");

        // Execute the call as authorized by the signer
        success = authCallSimple(to, data, 0, gasleft());
        require(success, "Call execution failed");
    }

    function getDigest(bytes memory commitData, uint256 nonce) external view returns (bytes32 digest) {
        digest = getDigest(keccak256(commitData), nonce);
    }
}
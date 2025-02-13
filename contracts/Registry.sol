// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlDefaultAdminRules} from '@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Registry is AccessControlDefaultAdminRules {
  using SafeERC20 for IERC20;

  // Each value in rewardRates is the numerator of a fraction whose
  // denominator is fixed at 1E18; the true reward rate is calculated
  // by dividing the numerator by this number.
  event ReferrerRegistered(
    bytes32 indexed referrerId,
    bytes32[] protocolIds,
    uint256[] rewardRates,
    address rewardAddress
  );

  event ReferralRegistered(
    bytes32 indexed protocolId,
    bytes32 indexed referrerId,
    address indexed userAddress
  );

  error ReferrerNotRegistered(bytes32 protocolId, bytes32 referrerId);

  error UserAlreadyRegistered(
    bytes32 protocolId,
    bytes32 referrerId,
    address userAddress
  );

  struct User {
    uint256 timestamp;
  }

  struct Referrer {
    uint256 rewardRate;
    address[] userAddresses;
  }

  mapping(bytes32 => bytes32[]) private _protocolIdToReferrerIds;
  // Reverse lookup needed when re-registering a referrer
  mapping(bytes32 => bytes32[]) private _referrerIdToProtocolIds;
  mapping(bytes32 => address) private _referrerIdToRewardAddress;
  mapping(bytes32 => mapping(bytes32 => Referrer))
    private _referrerInfoByProtocol;
  mapping(bytes32 => mapping(address => User)) private _userInfoByProtocol;

  constructor(
    address owner,
    uint48 transferDelay
  ) AccessControlDefaultAdminRules(transferDelay, owner) {}

  function registerReferrer(
    bytes32 referrerId,
    bytes32[] calldata protocolIds,
    uint256[] calldata rewardRates,
    address rewardAddress
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    // Remove referrer from protocols from previous registrations
    for (uint256 i = 0; i < _referrerIdToProtocolIds[referrerId].length; i++) {
      bytes32 protocol = _referrerIdToProtocolIds[referrerId][i];
      bytes32[] storage referrerIds = _protocolIdToReferrerIds[protocol];

      for (uint256 j = 0; j < referrerIds.length; j++) {
        if (
            referrerIds[j] == referrerId
        ) {
          // Replace the current element with the last element
          referrerIds[j] = referrerIds[referrerIds.length - 1];
          referrerIds.pop(); // Remove the last element
          break; // Exit the inner loop after removal
        }
      }
    }
    // Reset the list of protocols for the referrer
    _referrerIdToProtocolIds[referrerId] = new bytes32[](0);
    // Add/update the reward rate for each protocol, add the referrer to the list of referrers for each protocol
    for (uint256 i = 0; i < protocolIds.length; i++) {
      _referrerInfoByProtocol[protocolIds[i]][referrerId]
        .rewardRate = rewardRates[i];
      _protocolIdToReferrerIds[protocolIds[i]].push(referrerId);
      // Update the list of protocols for the referrer (need to copy each element individually, cannot just assign the array)
      _referrerIdToProtocolIds[referrerId].push(protocolIds[i]);
    }
    // Update/add the reward address for the referrer
    _referrerIdToRewardAddress[referrerId] = rewardAddress;
    emit ReferrerRegistered(
      referrerId,
      protocolIds,
      rewardRates,
      rewardAddress
    );
  }

  function isUserRegistered(
                                 address userAddress,
                                 bytes32[] calldata protocolIds
  ) external view returns (bool[] memory) {
      bool[] memory registeredStatuses = new bool[](protocolIds.length);
      for (uint256 i = 0; i < protocolIds.length; i++) {
          registeredStatuses[i] = _userInfoByProtocol[protocolIds[i]][userAddress].timestamp != 0;
      }
      return registeredStatuses;
  }

  function registerReferrals(
    bytes32 referrerId,
    bytes32[] calldata protocolIds
  ) external {
      for (uint256 i = 0; i < protocolIds.length; i++) {
                bool referrerIsRegistered = false;
                bytes32 protocolId = protocolIds[i];
      for (uint256 j = 0; j < _referrerIdToProtocolIds[referrerId].length; j++) {
      if (
        _referrerIdToProtocolIds[referrerId][j] == protocolId
      ) {
        referrerIsRegistered = true;
        break;
      }
    }
    // Check if the referrer is active with the protocol
    if (!referrerIsRegistered) {
      revert ReferrerNotRegistered(protocolId, referrerId);
      // And that the user has not been registered before to the given protocol
    } else if (_userInfoByProtocol[protocolId][msg.sender].timestamp != 0) {
      revert UserAlreadyRegistered(protocolId, referrerId, msg.sender);
    } else {
      _userInfoByProtocol[protocolId][msg.sender] = User(block.timestamp);
      _referrerInfoByProtocol[protocolId][referrerId].userAddresses.push(
        msg.sender
      );
      emit ReferralRegistered(protocolId, referrerId, msg.sender);
    }
      }
  }

  function getReferrers(
    bytes32 protocolId
  ) external view returns (bytes32[] memory) {
    return _protocolIdToReferrerIds[protocolId];
  }

  function getProtocols(
    bytes32 providerId
  ) external view returns (bytes32[] memory) {
    return _referrerIdToProtocolIds[providerId];
  }

  function getUsers(
    bytes32 protocolId,
    bytes32 referrerId
  ) external view returns (address[] memory, uint256[] memory) {
    address[] memory userAddresses = _referrerInfoByProtocol[protocolId][
      referrerId
    ].userAddresses;
    uint256[] memory timestamps = new uint256[](userAddresses.length);

    for (uint256 i = 0; i < userAddresses.length; i++) {
      timestamps[i] = _userInfoByProtocol[protocolId][userAddresses[i]]
        .timestamp;
    }

    return (userAddresses, timestamps);
  }

  function getRewardRate(
    bytes32 protocolId,
    bytes32 referrerId
  ) external view returns (uint256) {
    return _referrerInfoByProtocol[protocolId][referrerId].rewardRate;
  }

  function getRewardAddress(
    bytes32 referrerId
  ) external view returns (address) {
    return _referrerIdToRewardAddress[referrerId];
  }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlDefaultAdminRules} from '@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Registry is AccessControlDefaultAdminRules {
  using SafeERC20 for IERC20;

  event ReferrerRegistered(
    string indexed referrerId,
    string[] protocolIds,
    uint256[] rewardRates,
    address rewardAddress
  );

  event ReferralRegistered(
    string indexed protocolId,
    string indexed referrerId,
    address indexed userAddress
  );

  error ReferrerNotRegistered(string protocolId, string referrerId);

  error UserAlreadyRegistered(
    string protocolId,
    string referrerId,
    address userAddress
  );

  struct User {
    uint256 timestamp;
  }

  struct Referrer {
    uint256 rewardRate;
    address[] userAddresses;
  }

  mapping(string => string[]) private _protocolIdToReferrerIds;
  // Reverse lookup needed when re-registering a referrer
  mapping(string => string[]) private _referrerIdToProtocolIds;
  mapping(string => address) private _referrerIdToRewardAddress;
  mapping(string => mapping(string => Referrer))
    private _referrerInfoByProtocol;
  mapping(string => mapping(address => User)) private _userInfoByProtocol;

  bool private _referrerIsRegistered;

  constructor(
    address owner,
    uint48 transferDelay
  ) AccessControlDefaultAdminRules(transferDelay, owner) {}

  function registerReferrer(
    string calldata referrerId,
    string[] calldata protocolIds,
    uint256[] calldata rewardRates,
    address rewardAddress
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    // Remove referrer from protocols from previous registrations
    for (uint256 i = 0; i < _referrerIdToProtocolIds[referrerId].length; i++) {
      string memory protocol = _referrerIdToProtocolIds[referrerId][i];
      string[] storage referrerIds = _protocolIdToReferrerIds[protocol];

      for (uint256 j = 0; j < referrerIds.length; j++) {
        if (
          keccak256(abi.encodePacked(referrerIds[j])) ==
          keccak256(abi.encodePacked(referrerId))
        ) {
          // Replace the current element with the last element
          referrerIds[j] = referrerIds[referrerIds.length - 1];
          referrerIds.pop(); // Remove the last element
          break; // Exit the inner loop after removal
        }
      }
    }
    // Reset the list of protocols for the referrer
    _referrerIdToProtocolIds[referrerId] = new string[](0);
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

  function registerReferral(
    string calldata referrerId,
    string calldata protocolId
  ) external {
    _referrerIsRegistered = false;
    for (uint256 i = 0; i < _referrerIdToProtocolIds[referrerId].length; i++) {
      if (
        keccak256(abi.encodePacked(_referrerIdToProtocolIds[referrerId][i])) ==
        keccak256(abi.encodePacked(protocolId))
      ) {
        _referrerIsRegistered = true;
        break;
      }
    }
    // Check if the referrer is active with the protocol
    if (!_referrerIsRegistered) {
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

  function getReferrers(
    string calldata protocolId
  ) external view returns (string[] memory) {
    return _protocolIdToReferrerIds[protocolId];
  }

  function getProtocols(
    string calldata providerId
  ) external view returns (string[] memory) {
    return _referrerIdToProtocolIds[providerId];
  }

  function getUsers(
    string calldata protocolId,
    string calldata referrerId
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
    string calldata protocolId,
    string calldata referrerId
  ) external view returns (uint256) {
    return _referrerInfoByProtocol[protocolId][referrerId].rewardRate;
  }

  function getRewardAddress(
    string calldata referrerId
  ) external view returns (address) {
    return _referrerIdToRewardAddress[referrerId];
  }
}

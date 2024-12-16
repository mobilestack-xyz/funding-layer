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
  
  event ReferralSkipped(
    string indexed protocolId,
    string indexed referrerId,
    address indexed userAddress
  );

  struct User {
    uint256 timestamp;
  }

  struct Referrer {
    address rewardAddress;
    uint256 rewardRate;
    address[] userAddresses;
  }

  struct Protocol {
    string[] _referrers;
  }

  mapping(string => Protocol) private _protocols;
  mapping(string => mapping(string => Referrer)) private _referrers;
  mapping(string => mapping(string => mapping(address => User))) private _users;

  constructor(
    address owner,
    uint48 transferDelay
  ) AccessControlDefaultAdminRules(transferDelay, owner) {}

  function registerReferrer(
    string calldata _referrerId,
    string[] calldata _protocolIds,
    uint256[] calldata _rewardRates,
    address _rewardAddress
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    for (uint256 i = 0; i < _protocolIds.length; i++) {
      _referrers[_protocolIds[i]][_referrerId] = Referrer(
        _rewardAddress,
        _rewardRates[i],
        new address[](0)
      );
      _protocols[_protocolIds[i]]._referrers.push(_referrerId);
    }
    emit ReferrerRegistered(_referrerId, _protocolIds, _rewardRates, _rewardAddress);
  }

  function registerReferral(
    string calldata referrerId,
    string calldata protocolId
  ) external {
    if (
      // Check if the referrer has been initialized but the user has not been registered before
      _referrers[protocolId][referrerId].rewardAddress != address(0) &&
      _users[protocolId][referrerId][msg.sender].timestamp == 0
    ) {
      _users[protocolId][referrerId][msg.sender] = User(block.timestamp);
      _referrers[protocolId][referrerId].userAddresses.push(msg.sender);
      emit ReferralRegistered(protocolId, referrerId, msg.sender);
    } else {
      emit ReferralSkipped(protocolId, referrerId, msg.sender);
    }
  }

  function getReferrers(
    string calldata protocolId
  ) external view returns (string[] memory) {
    return _protocols[protocolId]._referrers;
  }

  function getUsers(
    string calldata protocolId,
    string calldata referrerId
  ) external view returns (address[] memory, uint256[] memory) {
    address[] memory userAddresses = _referrers[protocolId][referrerId]
      .userAddresses;
    uint256[] memory timestamps = new uint256[](userAddresses.length);

    for (uint256 i = 0; i < userAddresses.length; i++) {
      timestamps[i] = _users[protocolId][referrerId][userAddresses[i]].timestamp;
    }

    return (userAddresses, timestamps);
  }

  function getRewardRate(
    string calldata protocolId,
    string calldata referrerId
  ) external view returns (uint256) {
    return _referrers[protocolId][referrerId].rewardRate;
  }
}

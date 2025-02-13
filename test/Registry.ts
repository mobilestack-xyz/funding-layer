import { expect } from 'chai'
import hre from 'hardhat'
import { getAddress } from 'ethers'
import { toBytes, bytesToHex } from 'viem'

const REGISTRY_CONTRACT_NAME = 'Registry'

const mockRewardAddress = getAddress(
  '0x471EcE3750Da237f93B8E339c536989b8978a499'.toLowerCase(),
)
const mockRewardAddress2 = getAddress(
  '0x123EcE3750Da237f93B8E339c536989b8978a499'.toLowerCase(),
)
const mockReferrerId = 'referrer1'
const mockReferrerIdBytes = toBytes(mockReferrerId, { size: 32 })
const mockReferrerIdHex = bytesToHex(mockReferrerIdBytes)
const mockReferrerId2 = 'referrer2'
const mockReferrerId2Bytes = toBytes(mockReferrerId2, { size: 32 })
const mockReferrerId2Hex = bytesToHex(mockReferrerId2Bytes)
const mockProtocolId = 'protocol1'
const mockProtocolIdBytes = toBytes(mockProtocolId, { size: 32 })
const mockProtocolIdHex = bytesToHex(mockProtocolIdBytes)
const mockProtocolId2 = 'protocol2'
const mockProtocolId2Bytes = toBytes(mockProtocolId2, { size: 32 })
const mockProtocolId2Hex = bytesToHex(mockProtocolId2Bytes)
const mockRewardRates = [10]

describe(REGISTRY_CONTRACT_NAME, function () {
  async function deployRegistryContract() {
    const [_owner, addr1] = await hre.ethers.getSigners()

    // Deploy the Registry contract
    const Registry = await hre.ethers.getContractFactory(REGISTRY_CONTRACT_NAME)
    const registry = await Registry.deploy(_owner.address, 0)
    return { registry, addr1 }
  }

  describe('Referrer Registration', function () {
    it('should register a referrer correctly', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes]

      await expect(
        registry.registerReferrer(
          mockReferrerIdBytes,
          protocolIds,
          mockRewardRates,
          mockRewardAddress,
        ),
      )
        .to.emit(registry, 'ReferrerRegistered')
        .withArgs(
          mockReferrerIdHex,
          [mockProtocolIdHex],
          mockRewardRates,
          mockRewardAddress,
        )

      // Check that the referrer was registered correctly
      const referrerRewardRate = await registry.getRewardRate(
        mockProtocolIdBytes,
        mockReferrerIdBytes,
      )
      expect(referrerRewardRate).to.equal(10)

      const referrers = await registry.getReferrers(mockProtocolIdBytes)
      expect(referrers).to.deep.equal([mockReferrerIdHex])
    })
    it('should register a referrer with multiple protocolIds', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes, mockProtocolId2Bytes]
      const rewardRates = [10, 20]

      await expect(
        registry.registerReferrer(
          mockReferrerIdBytes,
          protocolIds,
          rewardRates,
          mockRewardAddress,
        ),
      )
        .to.emit(registry, 'ReferrerRegistered')
        .withArgs(
          mockReferrerIdHex,
          [mockProtocolIdHex, mockProtocolId2Hex],
          rewardRates,
          mockRewardAddress,
        )

      // Check that the referrer was registered correctly to protocol1
      const rewardRate1 = await registry.getRewardRate(
        mockProtocolIdBytes,
        mockReferrerIdBytes,
      )
      expect(rewardRate1).to.equal(10)

      const referrersProtocol1 =
        await registry.getReferrers(mockProtocolIdBytes)
      expect(referrersProtocol1).to.deep.equal([mockReferrerIdHex])

      // Check that the referrer was registered correctly to protocol2
      const rewardRate2 = await registry.getRewardRate(
        mockProtocolId2Bytes,
        mockReferrerIdBytes,
      )
      expect(rewardRate2).to.equal(20)

      const referrersProtocol2 =
        await registry.getReferrers(mockProtocolId2Bytes)
      expect(referrersProtocol2).to.deep.equal([mockReferrerIdHex])
    })

    it('should correctly re-register a referrer', async function () {
      const { registry } = await deployRegistryContract()
      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )

      // Re-register the referrer with the different protocolIds
      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolId2Bytes],
        mockRewardRates,
        mockRewardAddress2,
      )
      // Check that the referrer is no longer registered to protocol1
      const referrersProtocol1 =
        await registry.getReferrers(mockProtocolIdBytes)
      expect(referrersProtocol1).to.deep.equal([])
      // Check that the referrer is now registered to protocol2
      const referrersProtocol2 =
        await registry.getReferrers(mockProtocolId2Bytes)
      expect(referrersProtocol2).to.deep.equal([mockReferrerIdHex])
      // Check that the protocol(s) for the referrer has been updated
      const protocols = await registry.getProtocols(mockReferrerIdBytes)
      expect(protocols).to.deep.equal([mockProtocolId2Hex])
      // Check that the referrer's reward address has been updated
      const rewardAddress = await registry.getRewardAddress(mockReferrerIdBytes)
      expect(rewardAddress).to.equal(mockRewardAddress2)
    })

    it('should allow only the owner to register a referrer', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes]

      // Non-owner (addr1) should not be able to register the referrer
      await expect(
        registry
          .connect(addr1)
          .registerReferrer(
            mockReferrerIdBytes,
            protocolIds,
            mockRewardRates,
            mockRewardAddress,
          ),
      ).to.be.rejectedWith('AccessControlUnauthorizedAccount')
    })
  })

  describe('Referral Registration', function () {
    it('should register a referral when referrer exists', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdBytes, [mockProtocolIdBytes]),
      )
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex, addr1.address)

      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolIdBytes,
        mockReferrerIdBytes,
      )
      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should register a referral to multiple protocols', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes, mockProtocolId2Bytes]
      const rewardRates = [10, 20]

      await registry.registerReferrer(
        mockReferrerIdBytes,
        protocolIds,
        rewardRates,
        mockRewardAddress,
      )

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdBytes, protocolIds),
      )
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex, addr1.address)
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolId2Hex, mockReferrerIdHex, addr1.address)

      const [userAddressesProtocol1, timestampsProtocol1] =
        await registry.getUsers(mockProtocolIdBytes, mockReferrerIdBytes)
      expect(userAddressesProtocol1).to.include(addr1.address)
      expect(timestampsProtocol1[0]).to.be.above(0)

      const [userAddressesProtocol2, timestampsProtocol2] =
        await registry.getUsers(mockProtocolId2Bytes, mockReferrerIdBytes)
      expect(userAddressesProtocol2).to.include(addr1.address)
      expect(timestampsProtocol2[0]).to.be.above(0)
    })

    it('should skip referral if the referrer does not exist', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdBytes, [mockProtocolIdBytes]),
      )
        .to.be.revertedWithCustomError(registry, 'ReferrerNotRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex)
    })

    it('should skip referral if the user is already registered', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry.registerReferrer(
        mockReferrerId2Bytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdBytes, [mockProtocolIdBytes])

      // Trying to register again should revert with custom error "UserAlreadyRegistered"
      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerId2Bytes, [mockProtocolIdBytes]),
      )
        .to.be.revertedWithCustomError(registry, 'UserAlreadyRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerId2Hex, addr1.address)
    })
  })

  describe('Getters', function () {
    it('should return whether or not a user is registered with multiple protocols', async function () {
      const { addr1, registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes]

      await registry.registerReferrer(
        mockReferrerIdBytes,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdBytes, [mockProtocolIdBytes])

      const referred = await registry.isUserRegistered(addr1, [
        mockProtocolIdBytes,
        mockProtocolId2Bytes,
      ])
      expect(referred).to.deep.equal([true, false])
    })

    it('should return referrers for a protocol', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes]

      await registry.registerReferrer(
        mockReferrerIdBytes,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      const referrers = await registry.getReferrers(mockProtocolIdBytes)
      expect(referrers).to.deep.equal([mockReferrerIdHex])
    })

    it('should return protocols for a referrer', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdBytes]

      await registry.registerReferrer(
        mockReferrerIdBytes,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      const protocols = await registry.getProtocols(mockReferrerIdBytes)
      expect(protocols).to.deep.equal([mockProtocolIdHex])
    })

    it('should return users and their timestamps', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )

      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdBytes, [mockProtocolIdBytes])
      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolIdBytes,
        mockReferrerIdBytes,
      )

      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should return the correct reward rate', async function () {
      const { registry } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )

      const rewardRate = await registry.getRewardRate(
        mockProtocolIdBytes,
        mockReferrerIdBytes,
      )
      expect(rewardRate).to.equal(mockRewardRates[0])
    })

    it('should return the correct reward address', async function () {
      const { registry } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdBytes,
        [mockProtocolIdBytes],
        mockRewardRates,
        mockRewardAddress,
      )

      const rewardRate = await registry.getRewardAddress(mockReferrerIdBytes)
      expect(rewardRate).to.equal(mockRewardAddress)
    })
  })
})

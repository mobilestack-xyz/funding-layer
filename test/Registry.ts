import { expect } from 'chai'
import { getAddress } from 'ethers'
import hre from 'hardhat'
import { stringToHex } from 'viem'

const REGISTRY_CONTRACT_NAME = 'Registry'

const mockRewardAddress = getAddress(
  '0x471EcE3750Da237f93B8E339c536989b8978a499'.toLowerCase(),
)
const mockRewardAddress2 = getAddress(
  '0x123EcE3750Da237f93B8E339c536989b8978a499'.toLowerCase(),
)
const mockReferrerId = 'referrer1'
const mockReferrerIdHex = stringToHex(mockReferrerId, { size: 32 })
const mockReferrerId2 = 'referrer2'
const mockReferrerId2Hex = stringToHex(mockReferrerId2, { size: 32 })
const mockProtocolId = 'protocol1'
const mockProtocolIdHex = stringToHex(mockProtocolId, { size: 32 })
const mockProtocolId2 = 'protocol2'
const mockProtocolId2Hex = stringToHex(mockProtocolId2, { size: 32 })
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
      const protocolIds = [mockProtocolIdHex]

      await expect(
        registry.registerReferrer(
          mockReferrerIdHex,
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
        mockProtocolIdHex,
        mockReferrerIdHex,
      )
      expect(referrerRewardRate).to.equal(10)

      const referrers = await registry.getReferrers(mockProtocolIdHex)
      expect(referrers).to.deep.equal([mockReferrerIdHex])
    })
    it('should register a referrer with multiple protocolIds', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex, mockProtocolId2Hex]
      const rewardRates = [10, 20]

      await expect(
        registry.registerReferrer(
          mockReferrerIdHex,
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
        mockProtocolIdHex,
        mockReferrerIdHex,
      )
      expect(rewardRate1).to.equal(10)

      const referrersProtocol1 = await registry.getReferrers(mockProtocolIdHex)
      expect(referrersProtocol1).to.deep.equal([mockReferrerIdHex])

      // Check that the referrer was registered correctly to protocol2
      const rewardRate2 = await registry.getRewardRate(
        mockProtocolId2Hex,
        mockReferrerIdHex,
      )
      expect(rewardRate2).to.equal(20)

      const referrersProtocol2 = await registry.getReferrers(mockProtocolId2Hex)
      expect(referrersProtocol2).to.deep.equal([mockReferrerIdHex])
    })

    it('should correctly re-register a referrer', async function () {
      const { registry } = await deployRegistryContract()
      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )

      // Re-register the referrer with the different protocolIds
      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolId2Hex],
        mockRewardRates,
        mockRewardAddress2,
      )
      // Check that the referrer is no longer registered to protocol1
      const referrersProtocol1 = await registry.getReferrers(mockProtocolIdHex)
      expect(referrersProtocol1).to.deep.equal([])
      // Check that the referrer is now registered to protocol2
      const referrersProtocol2 = await registry.getReferrers(mockProtocolId2Hex)
      expect(referrersProtocol2).to.deep.equal([mockReferrerIdHex])
      // Check that the protocol(s) for the referrer has been updated
      const protocols = await registry.getProtocols(mockReferrerIdHex)
      expect(protocols).to.deep.equal([mockProtocolId2Hex])
      // Check that the referrer's reward address has been updated
      const rewardAddress = await registry.getRewardAddress(mockReferrerIdHex)
      expect(rewardAddress).to.equal(mockRewardAddress2)
    })

    it('should allow only the owner to register a referrer', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex]

      // Non-owner (addr1) should not be able to register the referrer
      await expect(
        registry
          .connect(addr1)
          .registerReferrer(
            mockReferrerIdHex,
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
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdHex, [mockProtocolIdHex]),
      )
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex, addr1.address)

      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolIdHex,
        mockReferrerIdHex,
      )
      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should register a referral to multiple protocols', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex, mockProtocolId2Hex]
      const rewardRates = [10, 20]

      await registry.registerReferrer(
        mockReferrerIdHex,
        protocolIds,
        rewardRates,
        mockRewardAddress,
      )

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdHex, protocolIds),
      )
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex, addr1.address)
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolId2Hex, mockReferrerIdHex, addr1.address)

      const [userAddressesProtocol1, timestampsProtocol1] =
        await registry.getUsers(mockProtocolIdHex, mockReferrerIdHex)
      expect(userAddressesProtocol1).to.include(addr1.address)
      expect(timestampsProtocol1[0]).to.be.above(0)

      const [userAddressesProtocol2, timestampsProtocol2] =
        await registry.getUsers(mockProtocolId2Hex, mockReferrerIdHex)
      expect(userAddressesProtocol2).to.include(addr1.address)
      expect(timestampsProtocol2[0]).to.be.above(0)
    })

    it('should skip referral if the referrer does not exist', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerIdHex, [mockProtocolIdHex]),
      )
        .to.be.revertedWithCustomError(registry, 'ReferrerNotRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerIdHex)
    })

    it('should skip referral if the user is already registered', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry.registerReferrer(
        mockReferrerId2Hex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdHex, [mockProtocolIdHex])

      // Trying to register again should revert with custom error "UserAlreadyRegistered"
      await expect(
        registry
          .connect(addr1)
          .registerReferrals(mockReferrerId2Hex, [mockProtocolIdHex]),
      )
        .to.be.revertedWithCustomError(registry, 'UserAlreadyRegistered')
        .withArgs(mockProtocolIdHex, mockReferrerId2Hex, addr1.address)
    })
  })

  describe('Getters', function () {
    it('should return whether or not a user is registered with multiple protocols', async function () {
      const { addr1, registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex]

      await registry.registerReferrer(
        mockReferrerIdHex,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdHex, [mockProtocolIdHex])

      const referred = await registry.isUserRegistered(addr1, [
        mockProtocolIdHex,
        mockProtocolId2Hex,
      ])
      expect(referred).to.deep.equal([true, false])
    })

    it('should return referrers for a protocol', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex]

      await registry.registerReferrer(
        mockReferrerIdHex,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      const referrers = await registry.getReferrers(mockProtocolIdHex)
      expect(referrers).to.deep.equal([mockReferrerIdHex])
    })

    it('should return protocols for a referrer', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolIdHex]

      await registry.registerReferrer(
        mockReferrerIdHex,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      const protocols = await registry.getProtocols(mockReferrerIdHex)
      expect(protocols).to.deep.equal([mockProtocolIdHex])
    })

    it('should return users and their timestamps', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )

      await registry
        .connect(addr1)
        .registerReferrals(mockReferrerIdHex, [mockProtocolIdHex])
      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolIdHex,
        mockReferrerIdHex,
      )

      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should return the correct reward rate', async function () {
      const { registry } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )

      const rewardRate = await registry.getRewardRate(
        mockProtocolIdHex,
        mockReferrerIdHex,
      )
      expect(rewardRate).to.equal(mockRewardRates[0])
    })

    it('should return the correct reward address', async function () {
      const { registry } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerIdHex,
        [mockProtocolIdHex],
        mockRewardRates,
        mockRewardAddress,
      )

      const rewardRate = await registry.getRewardAddress(mockReferrerIdHex)
      expect(rewardRate).to.equal(mockRewardAddress)
    })
  })
})

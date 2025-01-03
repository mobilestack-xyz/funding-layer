import { expect } from 'chai'
import hre from 'hardhat'
import { getAddress } from 'ethers'

const REGISTRY_CONTRACT_NAME = 'Registry'

const mockRewardAddress = getAddress(
  '0x471EcE3750Da237f93B8E339c536989b8978a499'.toLowerCase(),
)
const mockReferrerId = 'referrer1'
const mockReferrerId2 = 'referrer2'
const mockProtocolId = 'protocol1'
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
      const protocolIds = [mockProtocolId]

      await expect(
        registry.registerReferrer(
          mockReferrerId,
          protocolIds,
          mockRewardRates,
          mockRewardAddress,
        ),
      )
        .to.emit(registry, 'ReferrerRegistered')
        .withArgs(
          mockReferrerId,
          protocolIds,
          mockRewardRates,
          mockRewardAddress,
        )

      // Check that the referrer was registered correctly
      const referrer = await registry.getRewardRate(
        mockProtocolId,
        mockReferrerId,
      )
      expect(referrer).to.equal(10)

      const referrers = await registry.getReferrers(mockProtocolId)
      expect(referrers).to.deep.equal([mockReferrerId])
    })
    it('should register a referrer with multiple protocolIds', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = ['protocol1', 'protocol2']
      const rewardRates = [10, 20]

      await expect(
        registry.registerReferrer(
          mockReferrerId,
          protocolIds,
          rewardRates,
          mockRewardAddress,
        ),
      )
        .to.emit(registry, 'ReferrerRegistered')
        .withArgs(mockReferrerId, protocolIds, rewardRates, mockRewardAddress)

      // Check that the referrer was registered correctly to protocol1
      const rewardRate1 = await registry.getRewardRate(
        'protocol1',
        mockReferrerId,
      )
      expect(rewardRate1).to.equal(10)

      const referrersProtocol1 = await registry.getReferrers('protocol1')
      expect(referrersProtocol1).to.deep.equal([mockReferrerId])

      // Check that the referrer was registered correctly to protocol2
      const rewardRate2 = await registry.getRewardRate(
        'protocol2',
        mockReferrerId,
      )
      expect(rewardRate2).to.equal(20)

      const referrersProtocol2 = await registry.getReferrers('protocol2')
      expect(referrersProtocol2).to.deep.equal([mockReferrerId])
    })
    it('should allow only the owner to register a referrer', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const protocolIds = [mockProtocolId]

      // Non-owner (addr1) should not be able to register the referrer
      await expect(
        registry
          .connect(addr1)
          .registerReferrer(
            mockReferrerId,
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
        mockReferrerId,
        [mockProtocolId],
        mockRewardRates,
        mockRewardAddress,
      )

      await expect(
        registry
          .connect(addr1)
          .registerReferral(mockReferrerId, mockProtocolId),
      )
        .to.emit(registry, 'ReferralRegistered')
        .withArgs(mockProtocolId, mockReferrerId, addr1.address)

      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolId,
        mockReferrerId,
      )
      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should skip referral if the referrer does not exist', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      const referrerId = 'referrerNotExist'

      await expect(
        registry.connect(addr1).registerReferral(referrerId, mockProtocolId),
      )
        .to.be.revertedWithCustomError(registry, 'ReferrerNotRegistered')
        .withArgs(mockProtocolId, referrerId)
    })

    it('should skip referral if the user is already registered', async function () {
      const { registry, addr1 } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerId,
        [mockProtocolId],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry.registerReferrer(
        mockReferrerId2,
        [mockProtocolId],
        mockRewardRates,
        mockRewardAddress,
      )
      await registry
        .connect(addr1)
        .registerReferral(mockReferrerId, mockProtocolId)

      // Trying to register again should emit "ReferralSkipped"
      await expect(
        registry
          .connect(addr1)
          .registerReferral(mockReferrerId2, mockProtocolId),
      )
        .to.be.revertedWithCustomError(registry, 'UserAlreadyRegistered')
        .withArgs(mockProtocolId, mockReferrerId2, addr1.address)
    })
  })

  describe('Getters', function () {
    it('should return referrers for a protocol', async function () {
      const { registry } = await deployRegistryContract()
      const protocolIds = [mockProtocolId]

      await registry.registerReferrer(
        mockReferrerId,
        protocolIds,
        mockRewardRates,
        mockRewardAddress,
      )

      const referrers = await registry.getReferrers(mockProtocolId)
      expect(referrers).to.deep.equal([mockReferrerId])
    })

    it('should return users and their timestamps', async function () {
      const { registry, addr1 } = await deployRegistryContract()
      await registry.registerReferrer(
        mockReferrerId,
        [mockProtocolId],
        mockRewardRates,
        mockRewardAddress,
      )

      await registry
        .connect(addr1)
        .registerReferral(mockReferrerId, mockProtocolId)
      const [userAddresses, timestamps] = await registry.getUsers(
        mockProtocolId,
        mockReferrerId,
      )

      expect(userAddresses).to.include(addr1.address)
      expect(timestamps[0]).to.be.above(0)
    })

    it('should return the correct reward rate', async function () {
      const { registry } = await deployRegistryContract()

      await registry.registerReferrer(
        mockReferrerId,
        [mockProtocolId],
        mockRewardRates,
        mockRewardAddress,
      )

      const rewardRate = await registry.getRewardRate(
        mockProtocolId,
        mockReferrerId,
      )
      expect(rewardRate).to.equal(mockRewardRates[0])
    })
  })
})

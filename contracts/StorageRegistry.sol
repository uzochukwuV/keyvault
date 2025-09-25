// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StorageRegistry
 * @dev Tracks Filecoin storage providers and manages deal distribution
 * Ensures redundancy and monitors storage deal health
 */
contract StorageRegistry {
    struct StorageProvider {
        address providerAddress;
        string providerInfo;     // Provider metadata (name, location, etc.)
        uint256 reputation;      // Reputation score (0-100)
        uint256 dealCount;       // Number of active deals
        bool isActive;
        uint256 registeredAt;
    }

    struct StorageDeal {
        address owner;           // Vault owner
        address provider;        // Storage provider
        string dataCid;         // IPFS/Filecoin CID of stored data
        uint256 dealId;         // Filecoin deal ID
        uint256 startEpoch;     // Deal start epoch
        uint256 endEpoch;       // Deal end epoch
        uint256 storagePrice;   // Price per epoch
        bytes32 dataHash;       // Hash of original data for verification
        DealStatus status;
        uint256 createdAt;
    }

    enum DealStatus {
        Pending,
        Active,
        Expired,
        Failed,
        Renewed
    }

    struct RedundancyConfig {
        uint8 minReplicas;      // Minimum number of replicas required
        uint8 maxReplicas;      // Maximum number of replicas allowed
        uint256 renewalWindow;  // Time before expiry to start renewal process
    }

    /// @notice Registry of storage providers
    mapping(address => StorageProvider) public providers;
    address[] public providerList;

    /// @notice Storage deals by owner and deal ID
    mapping(address => mapping(bytes32 => StorageDeal)) public deals;

    /// @notice Track all deal IDs for an owner
    mapping(address => bytes32[]) public ownerDeals;

    /// @notice Redundancy configuration for each vault owner
    mapping(address => RedundancyConfig) public redundancyConfigs;

    /// @notice Track replicas of the same data across providers
    mapping(bytes32 => address[]) public dataReplicas; // dataHash => provider addresses

    /// --- Events ---
    event ProviderRegistered(address indexed provider, string providerInfo);
    event ProviderDeactivated(address indexed provider);
    event DealCreated(address indexed owner, bytes32 dealId, address provider, string dataCid);
    event DealStatusUpdated(bytes32 dealId, DealStatus oldStatus, DealStatus newStatus);
    event DealRenewed(bytes32 dealId, uint256 newEndEpoch);
    event RedundancyConfigured(address indexed owner, uint8 minReplicas, uint8 maxReplicas);
    event ReplicationCompleted(bytes32 dataHash, uint8 replicaCount);

    /// --- Modifiers ---
    modifier onlyActiveProvider() {
        require(providers[msg.sender].isActive, "StorageRegistry: provider not active");
        _;
    }

    /// --- Core Functions ---

    /**
     * @notice Register a new storage provider
     * @param providerAddress The provider's address
     * @param providerInfo Metadata about the provider
     */
    function registerProvider(address providerAddress, string calldata providerInfo) external {
        require(providerAddress != address(0), "StorageRegistry: invalid provider address");
        require(!providers[providerAddress].isActive, "StorageRegistry: provider already registered");

        providers[providerAddress] = StorageProvider({
            providerAddress: providerAddress,
            providerInfo: providerInfo,
            reputation: 50, // Start with neutral reputation
            dealCount: 0,
            isActive: true,
            registeredAt: block.timestamp
        });

        providerList.push(providerAddress);
        emit ProviderRegistered(providerAddress, providerInfo);
    }

    /**
     * @notice Deactivate a storage provider
     * @param providerAddress The provider to deactivate
     */
    function deactivateProvider(address providerAddress) external {
        require(providers[providerAddress].isActive, "StorageRegistry: provider not active");
        providers[providerAddress].isActive = false;
        emit ProviderDeactivated(providerAddress);
    }

    /**
     * @notice Configure redundancy settings for a vault owner
     * @param owner The vault owner
     * @param minReplicas Minimum number of replicas
     * @param maxReplicas Maximum number of replicas
     * @param renewalWindow Time before expiry to renew deals (in seconds)
     */
    function configureRedundancy(
        address owner,
        uint8 minReplicas,
        uint8 maxReplicas,
        uint256 renewalWindow
    ) external {
        require(minReplicas > 0 && minReplicas <= maxReplicas, "StorageRegistry: invalid replica config");
        require(maxReplicas <= providerList.length, "StorageRegistry: not enough providers");

        redundancyConfigs[owner] = RedundancyConfig({
            minReplicas: minReplicas,
            maxReplicas: maxReplicas,
            renewalWindow: renewalWindow
        });

        emit RedundancyConfigured(owner, minReplicas, maxReplicas);
    }

    /**
     * @notice Create a new storage deal
     * @param owner The vault owner
     * @param provider The storage provider
     * @param dataCid The IPFS/Filecoin CID
     * @param dealId The Filecoin deal ID
     * @param startEpoch Deal start epoch
     * @param endEpoch Deal end epoch
     * @param storagePrice Price per epoch
     * @param dataHash Hash of the original data
     */
    function createDeal(
        address owner,
        address provider,
        string calldata dataCid,
        uint256 dealId,
        uint256 startEpoch,
        uint256 endEpoch,
        uint256 storagePrice,
        bytes32 dataHash
    ) external returns (bytes32 dealHash) {
        require(providers[provider].isActive, "StorageRegistry: provider not active");
        require(bytes(dataCid).length > 0, "StorageRegistry: empty CID");

        dealHash = keccak256(abi.encodePacked(owner, provider, dataCid, dealId, block.timestamp));

        deals[owner][dealHash] = StorageDeal({
            owner: owner,
            provider: provider,
            dataCid: dataCid,
            dealId: dealId,
            startEpoch: startEpoch,
            endEpoch: endEpoch,
            storagePrice: storagePrice,
            dataHash: dataHash,
            status: DealStatus.Pending,
            createdAt: block.timestamp
        });

        ownerDeals[owner].push(dealHash);
        providers[provider].dealCount++;

        // Track replica for redundancy
        dataReplicas[dataHash].push(provider);

        emit DealCreated(owner, dealHash, provider, dataCid);
        return dealHash;
    }

    /**
     * @notice Update deal status
     * @param owner The vault owner
     * @param dealHash The deal hash
     * @param newStatus The new status
     */
    function updateDealStatus(address owner, bytes32 dealHash, DealStatus newStatus) external {
        StorageDeal storage deal = deals[owner][dealHash];
        require(deal.createdAt > 0, "StorageRegistry: deal does not exist");

        DealStatus oldStatus = deal.status;
        deal.status = newStatus;

        emit DealStatusUpdated(dealHash, oldStatus, newStatus);
    }

    /**
     * @notice Renew a storage deal
     * @param owner The vault owner
     * @param dealHash The deal hash
     * @param newEndEpoch New end epoch
     */
    function renewDeal(address owner, bytes32 dealHash, uint256 newEndEpoch) external {
        StorageDeal storage deal = deals[owner][dealHash];
        require(deal.createdAt > 0, "StorageRegistry: deal does not exist");
        require(newEndEpoch > deal.endEpoch, "StorageRegistry: invalid new end epoch");

        deal.endEpoch = newEndEpoch;
        deal.status = DealStatus.Renewed;

        emit DealRenewed(dealHash, newEndEpoch);
    }

    /**
     * @notice Get optimal storage providers for redundancy
     * @param owner The vault owner
     * @param excludeProviders Providers to exclude from selection
     * @return selectedProviders Array of provider addresses
     */
    function selectProvidersForRedundancy(
        address owner,
        address[] calldata excludeProviders
    ) external view returns (address[] memory selectedProviders) {
        RedundancyConfig memory config = redundancyConfigs[owner];
        require(config.minReplicas > 0, "StorageRegistry: redundancy not configured");

        // Simple selection algorithm - can be enhanced with reputation, geography, etc.
        uint8 needed = config.maxReplicas;
        selectedProviders = new address[](needed);
        uint8 selected = 0;

        for (uint256 i = 0; i < providerList.length && selected < needed; i++) {
            address provider = providerList[i];

            // Skip if provider is not active
            if (!providers[provider].isActive) continue;

            // Skip if provider is in exclude list
            bool shouldExclude = false;
            for (uint256 j = 0; j < excludeProviders.length; j++) {
                if (provider == excludeProviders[j]) {
                    shouldExclude = true;
                    break;
                }
            }
            if (shouldExclude) continue;

            selectedProviders[selected] = provider;
            selected++;
        }

        // Resize array to actual selected count
        assembly {
            mstore(selectedProviders, selected)
        }
    }

    /// --- View Functions ---

    /**
     * @notice Get all active storage providers
     */
    function getActiveProviders() external view returns (address[] memory activeProviders) {
        uint256 activeCount = 0;

        // Count active providers
        for (uint256 i = 0; i < providerList.length; i++) {
            if (providers[providerList[i]].isActive) {
                activeCount++;
            }
        }

        activeProviders = new address[](activeCount);
        uint256 index = 0;

        // Populate active providers array
        for (uint256 i = 0; i < providerList.length; i++) {
            if (providers[providerList[i]].isActive) {
                activeProviders[index] = providerList[i];
                index++;
            }
        }
    }

    /**
     * @notice Get storage deal information
     */
    function getDeal(address owner, bytes32 dealHash) external view returns (
        address provider,
        string memory dataCid,
        uint256 dealId,
        uint256 startEpoch,
        uint256 endEpoch,
        DealStatus status
    ) {
        StorageDeal memory deal = deals[owner][dealHash];
        return (
            deal.provider,
            deal.dataCid,
            deal.dealId,
            deal.startEpoch,
            deal.endEpoch,
            deal.status
        );
    }

    /**
     * @notice Get all deal IDs for an owner
     */
    function getOwnerDeals(address owner) external view returns (bytes32[] memory) {
        return ownerDeals[owner];
    }

    /**
     * @notice Get replicas of specific data
     */
    function getDataReplicas(bytes32 dataHash) external view returns (address[] memory) {
        return dataReplicas[dataHash];
    }

    /**
     * @notice Check if minimum redundancy is met for specific data
     */
    function isRedundancyMet(address owner, bytes32 dataHash) external view returns (bool) {
        RedundancyConfig memory config = redundancyConfigs[owner];
        if (config.minReplicas == 0) return true; // No redundancy required

        uint8 activeReplicas = 0;
        address[] memory replicas = dataReplicas[dataHash];

        for (uint256 i = 0; i < replicas.length; i++) {
            if (providers[replicas[i]].isActive) {
                activeReplicas++;
            }
        }

        return activeReplicas >= config.minReplicas;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ShamirRecovery
 * @dev Manages Shamir Secret Sharing for KeyVault recovery
 * Stores share metadata and coordinates reconstruction
 */
contract ShamirRecovery {
    struct ShareInfo {
        uint256 shareIndex;     // Share index (1-based)
        string storageCid;      // Filecoin CID where share is stored
        address storageProvider; // Filecoin storage provider
        bytes32 shareHash;      // Hash of encrypted share for verification
        uint256 timestamp;      // When share was created
        bool isActive;          // Whether share is still valid
    }

    struct ShamirConfig {
        uint8 threshold;        // M in M-of-N scheme (minimum shares needed)
        uint8 totalShares;      // N in M-of-N scheme (total shares created)
        uint256 createdAt;      // Timestamp when shares were created
        bool isInitialized;     // Whether Shamir sharing is set up
    }

    /// @notice Mapping of vault owner to their Shamir configuration
    mapping(address => ShamirConfig) public shamirConfigs;

    /// @notice Mapping of vault owner to share index to share info
    mapping(address => mapping(uint256 => ShareInfo)) public shares;

    /// @notice Mapping to track active recovery attempts
    mapping(address => mapping(bytes32 => RecoveryAttempt)) public recoveryAttempts;

    struct RecoveryAttempt {
        address initiator;
        uint256 submittedShares;
        uint256 requiredShares;
        uint256 deadline;
        bool isComplete;
        mapping(uint256 => bytes) submittedShareData;
    }

    /// --- Events ---
    event ShamirConfigured(address indexed owner, uint8 threshold, uint8 totalShares);
    event ShareStored(address indexed owner, uint256 shareIndex, string storageCid, address storageProvider);
    event ShareRevoked(address indexed owner, uint256 shareIndex);
    event RecoveryInitiated(address indexed owner, bytes32 recoveryId, uint256 deadline);
    event ShareSubmitted(address indexed owner, bytes32 recoveryId, uint256 shareIndex);
    event RecoveryCompleted(address indexed owner, bytes32 recoveryId);

    /// --- Modifiers ---
    modifier onlyValidConfig(address owner) {
        require(shamirConfigs[owner].isInitialized, "ShamirRecovery: not configured");
        _;
    }

    /// --- Core Functions ---

    /**
     * @notice Configure Shamir Secret Sharing for a vault owner
     * @param owner The vault owner address
     * @param threshold Minimum shares required for recovery (M)
     * @param totalShares Total shares to create (N)
     */
    function configureShamir(
        address owner,
        uint8 threshold,
        uint8 totalShares
    ) external {
        require(threshold > 0 && threshold <= totalShares, "ShamirRecovery: invalid threshold");
        require(totalShares >= 2 && totalShares <= 255, "ShamirRecovery: invalid total shares");
        require(!shamirConfigs[owner].isInitialized, "ShamirRecovery: already configured");

        shamirConfigs[owner] = ShamirConfig({
            threshold: threshold,
            totalShares: totalShares,
            createdAt: block.timestamp,
            isInitialized: true
        });

        emit ShamirConfigured(owner, threshold, totalShares);
    }

    /**
     * @notice Store a Shamir share on Filecoin
     * @param owner The vault owner address
     * @param shareIndex The index of this share (1-based)
     * @param storageCid The Filecoin CID where encrypted share is stored
     * @param storageProvider The Filecoin storage provider address
     * @param shareHash Hash of the encrypted share for verification
     */
    function storeShare(
        address owner,
        uint256 shareIndex,
        string calldata storageCid,
        address storageProvider,
        bytes32 shareHash
    ) external onlyValidConfig(owner) {
        require(shareIndex > 0 && shareIndex <= shamirConfigs[owner].totalShares, "ShamirRecovery: invalid share index");
        require(bytes(storageCid).length > 0, "ShamirRecovery: empty CID");
        require(storageProvider != address(0), "ShamirRecovery: invalid provider");

        shares[owner][shareIndex] = ShareInfo({
            shareIndex: shareIndex,
            storageCid: storageCid,
            storageProvider: storageProvider,
            shareHash: shareHash,
            timestamp: block.timestamp,
            isActive: true
        });

        emit ShareStored(owner, shareIndex, storageCid, storageProvider);
    }

    /**
     * @notice Initiate recovery process
     * @param owner The vault owner to recover for
     * @return recoveryId Unique identifier for this recovery attempt
     */
    function initiateRecovery(address owner) external onlyValidConfig(owner) returns (bytes32 recoveryId) {
        recoveryId = keccak256(abi.encodePacked(owner, msg.sender, block.timestamp, block.difficulty));

        RecoveryAttempt storage attempt = recoveryAttempts[owner][recoveryId];
        attempt.initiator = msg.sender;
        attempt.submittedShares = 0;
        attempt.requiredShares = shamirConfigs[owner].threshold;
        attempt.deadline = block.timestamp + 24 hours; // 24 hour deadline
        attempt.isComplete = false;

        emit RecoveryInitiated(owner, recoveryId, attempt.deadline);
        return recoveryId;
    }

    /**
     * @notice Submit a share for recovery
     * @param owner The vault owner being recovered
     * @param recoveryId The recovery attempt identifier
     * @param shareIndex The index of the share being submitted
     * @param shareData The decrypted share data
     */
    function submitShare(
        address owner,
        bytes32 recoveryId,
        uint256 shareIndex,
        bytes calldata shareData
    ) external {
        RecoveryAttempt storage attempt = recoveryAttempts[owner][recoveryId];
        require(attempt.deadline > block.timestamp, "ShamirRecovery: recovery expired");
        require(!attempt.isComplete, "ShamirRecovery: recovery already complete");
        require(shares[owner][shareIndex].isActive, "ShamirRecovery: share not active");

        // Verify share hash
        bytes32 submittedHash = keccak256(shareData);
        require(submittedHash == shares[owner][shareIndex].shareHash, "ShamirRecovery: invalid share");

        // Store the share data
        attempt.submittedShareData[shareIndex] = shareData;
        attempt.submittedShares++;

        emit ShareSubmitted(owner, recoveryId, shareIndex);

        // Check if we have enough shares
        if (attempt.submittedShares >= attempt.requiredShares) {
            attempt.isComplete = true;
            emit RecoveryCompleted(owner, recoveryId);
        }
    }

    /**
     * @notice Revoke a share (mark as inactive)
     * @param owner The vault owner
     * @param shareIndex The share index to revoke
     */
    function revokeShare(address owner, uint256 shareIndex) external {
        require(shares[owner][shareIndex].isActive, "ShamirRecovery: share not active");
        shares[owner][shareIndex].isActive = false;
        emit ShareRevoked(owner, shareIndex);
    }

    /// --- View Functions ---

    /**
     * @notice Get Shamir configuration for an owner
     */
    function getShamirConfig(address owner) external view returns (uint8 threshold, uint8 totalShares, uint256 createdAt, bool isInitialized) {
        ShamirConfig memory config = shamirConfigs[owner];
        return (config.threshold, config.totalShares, config.createdAt, config.isInitialized);
    }

    /**
     * @notice Get share information
     */
    function getShare(address owner, uint256 shareIndex) external view returns (
        string memory storageCid,
        address storageProvider,
        bytes32 shareHash,
        uint256 timestamp,
        bool isActive
    ) {
        ShareInfo memory share = shares[owner][shareIndex];
        return (share.storageCid, share.storageProvider, share.shareHash, share.timestamp, share.isActive);
    }

    /**
     * @notice Check if recovery is complete and get share data
     */
    function getRecoveryData(address owner, bytes32 recoveryId) external view returns (
        bool isComplete,
        uint256 submittedShares,
        uint256 requiredShares
    ) {
        RecoveryAttempt storage attempt = recoveryAttempts[owner][recoveryId];
        return (attempt.isComplete, attempt.submittedShares, attempt.requiredShares);
    }

    /**
     * @notice Get submitted share data for recovery (only if complete)
     */
    function getSubmittedShareData(address owner, bytes32 recoveryId, uint256 shareIndex) external view returns (bytes memory) {
        RecoveryAttempt storage attempt = recoveryAttempts[owner][recoveryId];
        require(attempt.isComplete, "ShamirRecovery: recovery not complete");
        return attempt.submittedShareData[shareIndex];
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ShamirRecovery.sol";
import "./SocialRecovery.sol";
import "./StorageRegistry.sol";

/**
 * @title KeyVault
 * @dev Enhanced vault contract with dual recovery methods (Shamir + Social)
 *      - Integrates with Filecoin for decentralized storage
 *      - Supports Shamir's Secret Sharing and Social Recovery
 *      - Manages private keys with redundant backup strategies
 */
contract KeyVault {
    /// @notice The wallet (smart account or EOA) that owns this vault
    address public owner;

    /// @notice Private key record structure
    struct KeyRecord {
        string title;           // Key title/name
        string keyType;         // Type: "crypto", "ssh", "api", etc.
        string masterCid;       // Main encrypted key CID on Filecoin
        bytes encDataKey;       // Data key encrypted with user password
        bytes32 keyHash;        // Hash of original key for verification
        uint256 version;        // Version counter
        uint256 timestamp;      // When key was stored
        bool hasSharedShares;   // Whether Shamir shares exist
        bool hasSocialBackup;   // Whether social recovery is configured
    }

    /// @notice Recovery method enum
    enum RecoveryMethod {
        None,
        Shamir,
        Social,
        Both
    }

    /// @notice Recovery contracts
    ShamirRecovery public shamirRecovery;
    SocialRecovery public socialRecovery;
    StorageRegistry public storageRegistry;

    /// @notice Mapping of keyId to key record
    mapping(uint256 => KeyRecord) public keys;
    uint256 public keyCount;

    /// @notice User's preferred recovery method
    mapping(address => RecoveryMethod) public userRecoveryMethod;

    /// --- Events ---
    event KeyStored(uint256 indexed keyId, string title, string keyType, string masterCid);
    event KeyRetrieved(uint256 indexed keyId, string masterCid);
    event RecoveryMethodSet(address indexed user, RecoveryMethod method);
    event RecoveryInitiated(address indexed user, RecoveryMethod method, bytes32 recoveryId);
    event RecoveryCompleted(address indexed user, RecoveryMethod method);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    /// --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "KeyVault: caller is not owner");
        _;
    }

    modifier onlyRecoveryContract() {
        require(
            msg.sender == address(shamirRecovery) || msg.sender == address(socialRecovery),
            "KeyVault: caller is not recovery contract"
        );
        _;
    }

    /// --- Constructor ---
    constructor(
        address _owner,
        address _shamirRecovery,
        address _socialRecovery,
        address _storageRegistry
    ) {
        require(_owner != address(0), "KeyVault: invalid owner");
        require(_shamirRecovery != address(0), "KeyVault: invalid shamir recovery");
        require(_socialRecovery != address(0), "KeyVault: invalid social recovery");
        require(_storageRegistry != address(0), "KeyVault: invalid storage registry");

        owner = _owner;
        shamirRecovery = ShamirRecovery(_shamirRecovery);
        socialRecovery = SocialRecovery(_socialRecovery);
        storageRegistry = StorageRegistry(_storageRegistry);
    }

    /// --- Core Functions ---

    /**
     * @notice Set recovery method for the user
     * @param method The recovery method to use
     */
    function setRecoveryMethod(RecoveryMethod method) external onlyOwner {
        userRecoveryMethod[owner] = method;
        emit RecoveryMethodSet(owner, method);
    }

    /**
     * @notice Store a new encrypted private key with backup strategy
     * @param title The key title/name
     * @param keyType The type of key ("crypto", "ssh", "api", etc.)
     * @param masterCid The IPFS/Filecoin CID of the encrypted key
     * @param encDataKey The data key encrypted with user password
     * @param keyHash Hash of the original key for verification
     */
    function storeKey(
        string calldata title,
        string calldata keyType,
        string calldata masterCid,
        bytes calldata encDataKey,
        bytes32 keyHash
    ) external onlyOwner {
        keyCount++;

        keys[keyCount] = KeyRecord({
            title: title,
            keyType: keyType,
            masterCid: masterCid,
            encDataKey: encDataKey,
            keyHash: keyHash,
            version: keyCount,
            timestamp: block.timestamp,
            hasSharedShares: false,
            hasSocialBackup: false
        });

        emit KeyStored(keyCount, title, keyType, masterCid);
    }

    /**
     * @notice Enable Shamir Secret Sharing for a key
     * @param keyId The key ID to enable sharing for
     * @param threshold Minimum shares needed for recovery
     * @param totalShares Total shares to create
     */
    function enableShamirRecovery(
        uint256 keyId,
        uint8 threshold,
        uint8 totalShares
    ) external onlyOwner {
        require(keyId <= keyCount && keyId > 0, "KeyVault: invalid key ID");
        require(!keys[keyId].hasSharedShares, "KeyVault: Shamir already enabled");

        // Configure Shamir recovery for this owner
        shamirRecovery.configureShamir(owner, threshold, totalShares);
        keys[keyId].hasSharedShares = true;

        // Update recovery method if not set
        if (userRecoveryMethod[owner] == RecoveryMethod.None) {
            userRecoveryMethod[owner] = RecoveryMethod.Shamir;
            emit RecoveryMethodSet(owner, RecoveryMethod.Shamir);
        } else if (userRecoveryMethod[owner] == RecoveryMethod.Social) {
            userRecoveryMethod[owner] = RecoveryMethod.Both;
            emit RecoveryMethodSet(owner, RecoveryMethod.Both);
        }
    }

    /**
     * @notice Enable Social Recovery for a key
     * @param keyId The key ID to enable social recovery for
     * @param requiredApprovals Minimum guardian approvals needed
     * @param recoveryDelay Delay before recovery can be executed
     */
    function enableSocialRecovery(
        uint256 keyId,
        uint8 requiredApprovals,
        uint256 recoveryDelay
    ) external onlyOwner {
        require(keyId <= keyCount && keyId > 0, "KeyVault: invalid key ID");
        require(!keys[keyId].hasSocialBackup, "KeyVault: Social recovery already enabled");

        // Configure social recovery for this owner
        socialRecovery.configureSocialRecovery(owner, requiredApprovals, recoveryDelay);
        keys[keyId].hasSocialBackup = true;

        // Update recovery method if not set
        if (userRecoveryMethod[owner] == RecoveryMethod.None) {
            userRecoveryMethod[owner] = RecoveryMethod.Social;
            emit RecoveryMethodSet(owner, RecoveryMethod.Social);
        } else if (userRecoveryMethod[owner] == RecoveryMethod.Shamir) {
            userRecoveryMethod[owner] = RecoveryMethod.Both;
            emit RecoveryMethodSet(owner, RecoveryMethod.Both);
        }
    }

    /**
     * @notice Initiate recovery process using configured method
     * @param keyId The key ID to recover
     * @param method The recovery method to use
     */
    function initiateRecovery(uint256 keyId, RecoveryMethod method) external returns (bytes32 recoveryId) {
        require(keyId <= keyCount && keyId > 0, "KeyVault: invalid key ID");
        KeyRecord storage key = keys[keyId];

        if (method == RecoveryMethod.Shamir) {
            require(key.hasSharedShares, "KeyVault: Shamir not configured for this key");
            recoveryId = shamirRecovery.initiateRecovery(owner);
        } else if (method == RecoveryMethod.Social) {
            require(key.hasSocialBackup, "KeyVault: Social recovery not configured for this key");
            recoveryId = socialRecovery.proposeRecovery(owner, msg.sender);
        } else {
            revert("KeyVault: invalid recovery method");
        }

        emit RecoveryInitiated(msg.sender, method, recoveryId);
        return recoveryId;
    }

    /**
     * @notice Retrieve a stored key reference
     * @param keyId The ID of the key
     * @return title The key title
     * @return keyType The key type
     * @return masterCid The encrypted key CID
     * @return encDataKey The encrypted data key
     */
    function getKey(uint256 keyId) external view onlyOwner returns (
        string memory title,
        string memory keyType,
        string memory masterCid,
        bytes memory encDataKey
    ) {
        require(keyId <= keyCount && keyId > 0, "KeyVault: invalid key ID");
        KeyRecord memory key = keys[keyId];
        return (key.title, key.keyType, key.masterCid, key.encDataKey);
    }

    /**
     * @notice Transfer ownership to a new account (used by recovery contracts)
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyRecoveryContract {
        require(newOwner != address(0), "KeyVault: invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @notice Emergency transfer ownership (only by current owner)
     * @param newOwner The new owner address
     */
    function emergencyTransferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "KeyVault: invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// --- View Functions ---

    /**
     * @notice Get key recovery status
     * @param keyId The key ID
     */
    function getKeyRecoveryStatus(uint256 keyId) external view returns (
        bool hasSharedShares,
        bool hasSocialBackup,
        RecoveryMethod userMethod
    ) {
        require(keyId <= keyCount && keyId > 0, "KeyVault: invalid key ID");
        KeyRecord memory key = keys[keyId];
        return (key.hasSharedShares, key.hasSocialBackup, userRecoveryMethod[owner]);
    }

    /**
     * @notice Get all key IDs for the owner
     */
    function getKeyIds() external view onlyOwner returns (uint256[] memory) {
        uint256[] memory keyIds = new uint256[](keyCount);
        for (uint256 i = 1; i <= keyCount; i++) {
            keyIds[i-1] = i;
        }
        return keyIds;
    }
}



/// ------------------------------------------------------------
/// Parent Factory Contract
/// ------------------------------------------------------------
contract KeyVaultFactory {
    mapping(address => address) public userVaults;

    /// @notice Addresses of recovery contracts
    address public immutable shamirRecovery;
    address public immutable socialRecovery;
    address public immutable storageRegistry;

    event VaultDeployed(address indexed user, address vault);

    constructor(
        address _shamirRecovery,
        address _socialRecovery,
        address _storageRegistry
    ) {
        require(_shamirRecovery != address(0), "KeyVaultFactory: invalid shamir recovery");
        require(_socialRecovery != address(0), "KeyVaultFactory: invalid social recovery");
        require(_storageRegistry != address(0), "KeyVaultFactory: invalid storage registry");

        shamirRecovery = _shamirRecovery;
        socialRecovery = _socialRecovery;
        storageRegistry = _storageRegistry;
    }

    /**
     * @notice Deploy a new KeyVault for the caller (user)
     * @dev Each user can only deploy one vault
     */
    function deployVault(address owner) external returns (address vaultAddr) {
        require(userVaults[owner] == address(0), "KeyVaultFactory: vault already exists");

        KeyVault vault = new KeyVault(owner, shamirRecovery, socialRecovery, storageRegistry);
        vaultAddr = address(vault);

        userVaults[owner] = vaultAddr;
        emit VaultDeployed(owner, vaultAddr);
    }

    function deployVaultAndStoreKey(
        address owner,
        string calldata title,
        string calldata keyType,
        string calldata masterCid,
        bytes calldata encDataKey,
        bytes32 keyHash
    ) external returns (address vaultAddr) {
        require(userVaults[owner] == address(0), "KeyVaultFactory: vault already exists");

        KeyVault vault = new KeyVault(owner, shamirRecovery, socialRecovery, storageRegistry);
        vault.storeKey(title, keyType, masterCid, encDataKey, keyHash);
        vaultAddr = address(vault);

        userVaults[owner] = vaultAddr;
        emit VaultDeployed(owner, vaultAddr);
    }

    /**
     * @notice Get the vault address for a user
     * @param user The user address
     * @return The vault address
     */
    function getVault(address user) external view returns (address) {
        return userVaults[user];
    }
}

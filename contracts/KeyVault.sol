// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PasswordVault
 * @dev A minimal vault contract to store references to encrypted files.
 *      - Owner is an AA smart account (Safe, ZeroDev, etc.) or an EOA.
 *      - Recovery and guardian logic are handled by the wallet, not this contract.
 *      - On-chain storage contains:
 *          * File CID (IPFS/Filecoin)
 *          * Encrypted Data Key (encDK) encrypted with password-derived key
 */
contract PasswordVault {
    /// @notice The wallet (smart account or EOA) that owns this vault
    address public owner;

    /// @notice File metadata structure
    struct FileRecord {
        string title;
        string cid;         // Encrypted file CID on IPFS/Filecoin
        bytes encDataKey;   // Data key encrypted with password-derived key
        uint256 version;    // Version counter
        uint256 timestamp;  // Block timestamp when stored
    }

    /// @notice Mapping of fileId to file record
    mapping(uint256 => FileRecord) public files;
    uint256 public fileCount;

    /// --- Events ---
    event FileStored(uint256 indexed fileId, string cid, bytes encDataKey);
    event FileRetrieved(uint256 indexed fileId, string cid);
    event MultiplyFileStored(uint256 indexed fileId, string title, string cid, bytes encDataKey);

    /// --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "PasswordVault: caller is not owner");
        _;
    }

    /// --- Constructor ---
    constructor(address _owner) {
        require(_owner != address(0), "PasswordVault: invalid owner");
        owner = _owner;
    }

    /// --- Core Functions ---

    /**
     * @notice Store a new encrypted file reference
     * @param cid The IPFS/Filecoin CID of the encrypted file
     * @param encDataKey The data key encrypted with password-derived key
     */
    function storeFile(string calldata title, string calldata cid, bytes calldata encDataKey) external onlyOwner {
        fileCount++;
        files[fileCount] = FileRecord({
            title: title,
            cid: cid,
            encDataKey: encDataKey,
            version: fileCount,
            timestamp: block.timestamp
        });
        emit FileStored(fileCount, cid, encDataKey);
    }

     function storeFiles(
        string[] calldata titles,
        string[] calldata cids,
        bytes[] calldata encDataKeys
    ) external onlyOwner {
        require(
            titles.length == cids.length && cids.length == encDataKeys.length,
            "PasswordVault: input length mismatch"
        );

        for (uint256 i = 0; i < titles.length; i++) {
            fileCount++;
            files[fileCount] = FileRecord({
                title: titles[i],
                cid: cids[i],
                encDataKey: encDataKeys[i],
                version: fileCount,
                timestamp: block.timestamp
            });

            emit MultiplyFileStored(fileCount, titles[i], cids[i], encDataKeys[i]);
        }
    }

    /**
     * @notice Retrieve a stored file reference
     * @param fileId The ID of the file
     * @return cid The encrypted file CID
     * @return encDataKey The encrypted data key
     */
    function getFile(uint256 fileId) external view onlyOwner returns (string memory cid, bytes memory encDataKey) {
        FileRecord memory f = files[fileId];
        return (f.cid, f.encDataKey);
    }

    /**
     * @notice Transfer ownership to a new account (e.g., after recovery in AA wallet)
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PasswordVault: invalid new owner");
        owner = newOwner;
    }
}



/// ------------------------------------------------------------
/// Parent Factory Contract
/// ------------------------------------------------------------
contract PasswordVaultFactory {
    mapping(address => address) public userVaults;
    event VaultDeployed(address indexed user, address vault);

    /**
     * @notice Deploy a new vault for the caller (user)
     * @dev Each user can only deploy one vault
     */
    function deployVault(address owner) external returns (address vaultAddr) {
        require(userVaults[owner] == address(0), "Factory: vault already exists");

        PasswordVault vault = new PasswordVault(owner);
        vaultAddr = address(vault);

        userVaults[owner] = vaultAddr;
        emit VaultDeployed(owner, vaultAddr);
    }

    function deployVaultAndStore(address owner, string calldata title, string calldata cid, bytes calldata encDataKey) external returns (address vaultAddr) {
        require(userVaults[owner] == address(0), "Factory: vault already exists");

        PasswordVault vault = new PasswordVault(owner);
        vault.storeFile(title, cid, encDataKey);
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SocialRecovery
 * @dev Manages social recovery through trusted guardians
 * Implements voting-based recovery with timelock mechanisms
 */
contract SocialRecovery {
    struct Guardian {
        address guardianAddress;
        string encryptedShare;  // Encrypted recovery share for this guardian
        string storageCid;      // Filecoin CID where guardian's data is stored
        bool isActive;
        uint256 addedAt;
    }

    struct RecoveryProposal {
        address proposer;
        address newOwner;       // New owner address for recovery
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool isExecuted;
        bool isActive;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = for, false = against
    }

    struct SocialConfig {
        uint8 requiredApprovals;    // Minimum guardian approvals needed
        uint8 totalGuardians;       // Total number of guardians
        uint256 recoveryDelay;      // Delay before recovery can be executed (seconds)
        bool isInitialized;
    }

    /// @notice Mapping of vault owner to their social recovery configuration
    mapping(address => SocialConfig) public socialConfigs;

    /// @notice Mapping of vault owner to guardian index to guardian info
    mapping(address => mapping(uint256 => Guardian)) public guardians;

    /// @notice Mapping to track guardian addresses for quick lookup
    mapping(address => mapping(address => bool)) public isGuardian;

    /// @notice Active recovery proposals
    mapping(address => mapping(bytes32 => RecoveryProposal)) public recoveryProposals;

    /// @notice Track recovery proposal IDs for each owner
    mapping(address => bytes32[]) public ownerProposals;

    /// --- Events ---
    event SocialRecoveryConfigured(address indexed owner, uint8 requiredApprovals, uint256 recoveryDelay);
    event GuardianAdded(address indexed owner, address indexed guardian, uint256 guardianIndex);
    event GuardianRemoved(address indexed owner, address indexed guardian, uint256 guardianIndex);
    event RecoveryProposed(address indexed owner, bytes32 proposalId, address proposer, address newOwner, uint256 deadline);
    event RecoveryVoted(address indexed owner, bytes32 proposalId, address guardian, bool vote);
    event RecoveryExecuted(address indexed owner, bytes32 proposalId, address newOwner);
    event RecoveryRejected(address indexed owner, bytes32 proposalId);

    /// --- Modifiers ---
    modifier onlyValidConfig(address owner) {
        require(socialConfigs[owner].isInitialized, "SocialRecovery: not configured");
        _;
    }

    modifier onlyGuardian(address owner) {
        require(isGuardian[owner][msg.sender], "SocialRecovery: not a guardian");
        _;
    }

    /// --- Core Functions ---

    /**
     * @notice Configure social recovery for a vault owner
     * @param owner The vault owner address
     * @param requiredApprovals Minimum guardian approvals needed for recovery
     * @param recoveryDelay Delay in seconds before recovery can be executed
     */
    function configureSocialRecovery(
        address owner,
        uint8 requiredApprovals,
        uint256 recoveryDelay
    ) external {
        require(requiredApprovals > 0, "SocialRecovery: invalid required approvals");
        require(recoveryDelay >= 1 hours, "SocialRecovery: recovery delay too short");
        require(!socialConfigs[owner].isInitialized, "SocialRecovery: already configured");

        socialConfigs[owner] = SocialConfig({
            requiredApprovals: requiredApprovals,
            totalGuardians: 0,
            recoveryDelay: recoveryDelay,
            isInitialized: true
        });

        emit SocialRecoveryConfigured(owner, requiredApprovals, recoveryDelay);
    }

    /**
     * @notice Add a guardian for social recovery
     * @param owner The vault owner address
     * @param guardianAddress The guardian's address
     * @param encryptedShare The encrypted recovery share for this guardian
     * @param storageCid The Filecoin CID where guardian's recovery data is stored
     */
    function addGuardian(
        address owner,
        address guardianAddress,
        string calldata encryptedShare,
        string calldata storageCid
    ) external onlyValidConfig(owner) {
        require(guardianAddress != address(0), "SocialRecovery: invalid guardian address");
        require(guardianAddress != owner, "SocialRecovery: cannot be own guardian");
        require(!isGuardian[owner][guardianAddress], "SocialRecovery: guardian already exists");
        require(bytes(encryptedShare).length > 0, "SocialRecovery: empty encrypted share");

        uint256 guardianIndex = socialConfigs[owner].totalGuardians;
        guardians[owner][guardianIndex] = Guardian({
            guardianAddress: guardianAddress,
            encryptedShare: encryptedShare,
            storageCid: storageCid,
            isActive: true,
            addedAt: block.timestamp
        });

        isGuardian[owner][guardianAddress] = true;
        socialConfigs[owner].totalGuardians++;

        emit GuardianAdded(owner, guardianAddress, guardianIndex);
    }

    /**
     * @notice Remove a guardian
     * @param owner The vault owner address
     * @param guardianIndex The index of the guardian to remove
     */
    function removeGuardian(address owner, uint256 guardianIndex) external {
        require(guardianIndex < socialConfigs[owner].totalGuardians, "SocialRecovery: invalid guardian index");

        Guardian storage guardian = guardians[owner][guardianIndex];
        require(guardian.isActive, "SocialRecovery: guardian not active");

        guardian.isActive = false;
        isGuardian[owner][guardian.guardianAddress] = false;

        emit GuardianRemoved(owner, guardian.guardianAddress, guardianIndex);
    }

    /**
     * @notice Propose recovery (can be initiated by any guardian)
     * @param owner The vault owner to recover
     * @param newOwner The proposed new owner address
     */
    function proposeRecovery(address owner, address newOwner) external onlyGuardian(owner) returns (bytes32 proposalId) {
        require(newOwner != address(0), "SocialRecovery: invalid new owner");
        require(newOwner != owner, "SocialRecovery: same owner");

        proposalId = keccak256(abi.encodePacked(owner, newOwner, msg.sender, block.timestamp));

        RecoveryProposal storage proposal = recoveryProposals[owner][proposalId];
        proposal.proposer = msg.sender;
        proposal.newOwner = newOwner;
        proposal.votesFor = 1; // Proposer automatically votes for
        proposal.votesAgainst = 0;
        proposal.deadline = block.timestamp + socialConfigs[owner].recoveryDelay;
        proposal.isExecuted = false;
        proposal.isActive = true;
        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = true;

        ownerProposals[owner].push(proposalId);

        emit RecoveryProposed(owner, proposalId, msg.sender, newOwner, proposal.deadline);
        emit RecoveryVoted(owner, proposalId, msg.sender, true);

        return proposalId;
    }

    /**
     * @notice Vote on a recovery proposal
     * @param owner The vault owner being recovered
     * @param proposalId The recovery proposal ID
     * @param vote True for approval, false for rejection
     */
    function voteRecovery(address owner, bytes32 proposalId, bool vote) external onlyGuardian(owner) {
        RecoveryProposal storage proposal = recoveryProposals[owner][proposalId];
        require(proposal.isActive, "SocialRecovery: proposal not active");
        require(block.timestamp < proposal.deadline, "SocialRecovery: voting period ended");
        require(!proposal.hasVoted[msg.sender], "SocialRecovery: already voted");

        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = vote;

        if (vote) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }

        emit RecoveryVoted(owner, proposalId, msg.sender, vote);
    }

    /**
     * @notice Execute a recovery proposal (if enough votes and delay passed)
     * @param owner The vault owner being recovered
     * @param proposalId The recovery proposal ID
     */
    function executeRecovery(address owner, bytes32 proposalId) external {
        RecoveryProposal storage proposal = recoveryProposals[owner][proposalId];
        require(proposal.isActive, "SocialRecovery: proposal not active");
        require(block.timestamp >= proposal.deadline, "SocialRecovery: recovery delay not met");
        require(!proposal.isExecuted, "SocialRecovery: already executed");
        require(proposal.votesFor >= socialConfigs[owner].requiredApprovals, "SocialRecovery: insufficient votes");

        proposal.isExecuted = true;
        proposal.isActive = false;

        // Note: The actual ownership transfer should be handled by the main KeyVault contract
        // This contract only manages the voting and approval process

        emit RecoveryExecuted(owner, proposalId, proposal.newOwner);
    }

    /**
     * @notice Reject a recovery proposal (if majority voted against or deadline passed)
     * @param owner The vault owner
     * @param proposalId The recovery proposal ID
     */
    function rejectRecovery(address owner, bytes32 proposalId) external {
        RecoveryProposal storage proposal = recoveryProposals[owner][proposalId];
        require(proposal.isActive, "SocialRecovery: proposal not active");

        bool shouldReject = false;

        // Check if majority voted against
        if (proposal.votesAgainst > socialConfigs[owner].totalGuardians / 2) {
            shouldReject = true;
        }

        // Check if deadline passed without enough approvals
        if (block.timestamp >= proposal.deadline && proposal.votesFor < socialConfigs[owner].requiredApprovals) {
            shouldReject = true;
        }

        require(shouldReject, "SocialRecovery: cannot reject proposal");

        proposal.isActive = false;
        emit RecoveryRejected(owner, proposalId);
    }

    /// --- View Functions ---

    /**
     * @notice Get social recovery configuration for an owner
     */
    function getSocialConfig(address owner) external view returns (
        uint8 requiredApprovals,
        uint8 totalGuardians,
        uint256 recoveryDelay,
        bool isInitialized
    ) {
        SocialConfig memory config = socialConfigs[owner];
        return (config.requiredApprovals, config.totalGuardians, config.recoveryDelay, config.isInitialized);
    }

    /**
     * @notice Get guardian information
     */
    function getGuardian(address owner, uint256 guardianIndex) external view returns (
        address guardianAddress,
        string memory encryptedShare,
        string memory storageCid,
        bool isActive,
        uint256 addedAt
    ) {
        Guardian memory guardian = guardians[owner][guardianIndex];
        return (guardian.guardianAddress, guardian.encryptedShare, guardian.storageCid, guardian.isActive, guardian.addedAt);
    }

    /**
     * @notice Get recovery proposal information
     */
    function getRecoveryProposal(address owner, bytes32 proposalId) external view returns (
        address proposer,
        address newOwner,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 deadline,
        bool isExecuted,
        bool isActive
    ) {
        RecoveryProposal storage proposal = recoveryProposals[owner][proposalId];
        return (
            proposal.proposer,
            proposal.newOwner,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.deadline,
            proposal.isExecuted,
            proposal.isActive
        );
    }

    /**
     * @notice Get all recovery proposal IDs for an owner
     */
    function getOwnerProposals(address owner) external view returns (bytes32[] memory) {
        return ownerProposals[owner];
    }

    /**
     * @notice Check if an address has voted on a proposal
     */
    function hasVoted(address owner, bytes32 proposalId, address guardian) external view returns (bool) {
        return recoveryProposals[owner][proposalId].hasVoted[guardian];
    }

    /**
     * @notice Get the vote choice for a guardian on a proposal
     */
    function getVoteChoice(address owner, bytes32 proposalId, address guardian) external view returns (bool) {
        require(recoveryProposals[owner][proposalId].hasVoted[guardian], "SocialRecovery: guardian has not voted");
        return recoveryProposals[owner][proposalId].voteChoice[guardian];
    }
}
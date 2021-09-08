// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Contract for executing vesting schedules of an ERC20 token
 * @dev This implementation allows for setting individual vesting schedules per recipient, and tokens are
 * vested on a monthly basis. A multisignature contract is recommended for interfacing with this contract,
 * since it is authorized to add recipients and will initially hold tokens until they are sent to this 
 * contract when new recipients are added.
 */
contract TokenVesting {
    using SafeERC20 for IERC20;

    IERC20 private token;
    address private multiSigContract;
    bool private initialized = false;

    uint32 private constant SECONDS_PER_MONTH = 2628000;
    uint32 private constant SECONDS_PER_YEAR = SECONDS_PER_MONTH * 12;

    struct vestingSchedule {
        uint256 startTime;
        uint256 amount;
        uint16 vestingDuration;
        uint16 vestingCliff;
        uint16 monthsClaimed;
        uint256 tokensClaimed;
    }

    mapping(address => vestingSchedule) private vestingSchedules;

    event vestingScheduleAdded(
        address recipient, 
        uint256 startTime, 
        uint256 amount, 
        uint16 vestingDuration, 
        uint16 vestingCliff
    );
    event vestedTokensClaimed(address recipient, uint256 amountClaimed);

    modifier onlyMultiSigContract {
        require(msg.sender == multiSigContract, "TokenVesting: unauthorized address");
        _;
    }

    modifier nonZeroAddress(address x) {
        require(x != address(0), "TokenVesting: zero address");
        _;
    }

    modifier onlyUninitialized() {
        require(!initialized, "TokenVesting: contract already initialized");
        _;
    }

    function init(IERC20 _token, address _multiSigContract) external onlyUninitialized
        nonZeroAddress(address(_token)) nonZeroAddress(address(_multiSigContract)) {
        token = _token;
        multiSigContract = _multiSigContract;
        initialized = true;
    }

    /**
     * @return ERC20 token being held by contract
     */
    function getToken() public view returns (IERC20) {
        return token;
    }

    /**
     * @return address of multisig contract
     */
    function getMultiSigContract() public view returns (address) {
        return multiSigContract;
    }

    /**
     * @return Vesting schedule for specified recipient
     */
    function getVestingSchedule(address _recipient) public view returns (vestingSchedule memory) {
        return vestingSchedules[_recipient];
    }

    /**
     * @notice Adds a new vesting schedule for a recipient. Only one schedule is allowed per recipient. 
     * The amount of tokens specified must be approved for transfer by this contract from the multisig 
     * contract prior to making this call. This function is authorized for the multisig contract only.
     * @param _recipient Address of beneficiary entitled to vesting tokens
     * @param _startTime Start of vesting schedule as seconds since unix epoch
     * @param _amount Total number of vesting tokens
     * @param _vestingDuration Total duration of vesting schedule in months
     * @param _vestingCliff Total duration of vesting cliff in months
     */
    function addRecipient(
        address _recipient, 
        uint256 _startTime, 
        uint256 _amount, 
        uint16 _vestingDuration, 
        uint16 _vestingCliff
    ) external onlyMultiSigContract nonZeroAddress(_recipient) {
        require(vestingSchedules[_recipient].startTime == 0, "TokenVesting: recipient already added");
        require(_vestingDuration > 0, "TokenVesting: vesting duration zero");
        require(_vestingDuration <= 100, "TokenVesting: vesting duration longer than 100 months");
        require(_vestingDuration >= _vestingCliff, "TokenVesting: vesting cliff longer than duration");
        require(_startTime <= block.timestamp + SECONDS_PER_YEAR, "TokenVesting: start time more than a year in future");
        require(_startTime >= block.timestamp - SECONDS_PER_YEAR, "TokenVesting: start time more than a year in past");
        uint256 amountVestedPerMonth = _amount / _vestingDuration;
        require(amountVestedPerMonth > 0, "TokenVesting: zero tokens vested per month");

        vestingSchedule memory vest = vestingSchedule({
            startTime: _startTime == 0 ? block.timestamp : _startTime,
            amount: _amount,
            vestingDuration: _vestingDuration,
            vestingCliff: _vestingCliff,
            monthsClaimed: 0,
            tokensClaimed: 0
        });

        vestingSchedules[_recipient] = vest;

        // Transfer tokens from multisig to this contract, reverts on failure
        getToken().safeTransferFrom(multiSigContract, address(this), _amount);
        emit vestingScheduleAdded(
            _recipient, 
            vest.startTime, 
            _amount, 
            _vestingDuration,
            _vestingCliff
        );
    }

    /**
     * @notice Adds a new vesting schedule for a batch of recipients. The nth position in the amounts and 
     * recipients arrays corresponds to the amount of vesting tokens assigned to each recipient. All 
     * recipients in each batch are given a single vesting schedule. The total amount of tokens are sent
     * from the multisig contract in one tx. This function is authorized for the multisig contract only.
     * @param _recipients Array of address of beneficiaries entitled to vesting tokens
     * @param _startTime Start of vesting schedule as seconds since unix epoch
     * @param _amounts Array of numbers of vesting tokens assigned to each recipient
     * @param _vestingDuration Total duration of vesting schedule in months
     * @param _vestingCliff Total duration of vesting cliff in months
     */
    function addRecipientBatch(
        address[] calldata _recipients,
        uint256 _startTime,
        uint256[] calldata _amounts,
        uint16 _vestingDuration,
        uint16 _vestingCliff
    ) external onlyMultiSigContract {
        require(_recipients.length == _amounts.length, "TokenVesting: recipients and amounts mismatch");
        require(_vestingDuration > 0, "TokenVesting: vesting duration zero");
        require(_vestingDuration <= 100, "TokenVesting: vesting duration longer than 100 months");
        require(_vestingDuration >= _vestingCliff, "TokenVesting: vesting cliff longer than duration");
        require(_startTime <= block.timestamp + SECONDS_PER_YEAR, "TokenVesting: start time more than a year in future");
        require(_startTime >= block.timestamp - SECONDS_PER_YEAR, "TokenVesting: start time more than a year in past");

        uint256 amountTotal = 0;
        for (uint i = 0; i < _recipients.length; i++) {
            address recipient = _recipients[i];
            require(recipient != address(0), "TokenVesting: zero address");
            require(vestingSchedules[recipient].startTime == 0, "TokenVesting: recipient already added");
            uint256 amount = _amounts[i];
            uint256 amountVestedPerMonth = amount / _vestingDuration;
            require(amountVestedPerMonth > 0, "TokenVesting: zero tokens vested per month");

            vestingSchedule memory vest = vestingSchedule({
                startTime: _startTime == 0 ? block.timestamp : _startTime,
                amount: amount,
                vestingDuration: _vestingDuration,
                vestingCliff: _vestingCliff,
                monthsClaimed: 0,
                tokensClaimed: 0
            });

            vestingSchedules[recipient] = vest;
            amountTotal += amount;

            emit vestingScheduleAdded(
                recipient, 
                vest.startTime, 
                amount, 
                _vestingDuration,
                _vestingCliff
            );
        }
        
        // Transfer tokens from multisig to this contract, reverts on failure
        getToken().safeTransferFrom(multiSigContract, address(this), amountTotal);
    }
    
    /**
     * @notice Calculates the total unclaimed months and tokens vested for the recipient
     * @param _recipient Address of beneficiary receiving vested tokens
     * @return Vested months and tokens available to be claimed
     */
    function calculateVestedTokens(address _recipient) public view returns (uint16, uint256) {
        vestingSchedule memory vest = vestingSchedules[_recipient];

        // Check if startTime has passed
        if (block.timestamp < vest.startTime) {
            return (0, 0);
        }

        uint256 elapsedTime = block.timestamp - vest.startTime;
        uint16 elapsedMonths = uint16(elapsedTime / SECONDS_PER_MONTH);
        
        // Check if cliff was reached
        if (elapsedMonths < vest.vestingCliff) {
            return (0, 0);
        }

        // If over vesting duration, all tokens vested
        if (elapsedMonths >= vest.vestingDuration) {
            uint256 remainingTokens = vest.amount - vest.tokensClaimed;
            return (vest.vestingDuration, remainingTokens);
        } else {
            uint16 monthsVested = elapsedMonths - vest.monthsClaimed;
            uint256 amountVestedPerMonth = vest.amount / vest.vestingDuration;
            uint256 amountVested = monthsVested * amountVestedPerMonth;
            return (monthsVested, amountVested);
        }
    }

    /**
     * @notice Transfers vested tokens held by contract to a specified recipient
     * @param _recipient Address receiving vested tokens
     */
    function releaseVestedTokens(address _recipient) public {
        uint16 monthsVested;
        uint256 amountVested;
        (monthsVested, amountVested) = calculateVestedTokens(_recipient);
        require(amountVested > 0, "TokenVesting: zero vested tokens");

        vestingSchedule storage vest = vestingSchedules[_recipient];
        vest.monthsClaimed = vest.monthsClaimed + monthsVested;
        vest.tokensClaimed = vest.tokensClaimed + amountVested;
        
        // Transfer tokens from this contract to recipient, reverts on failure
        getToken().safeTransfer(_recipient, amountVested);
        emit vestedTokensClaimed(_recipient, amountVested);
    }

    /**
     * @notice Transfers vested tokens held by contract to a batch of recipients
     * @param _recipients Array of addresses receiving vested tokens
     */
    function releaseVestedTokensBatch(address[] calldata _recipients) external {
        require(_recipients.length != 0, "TokenVesting: not enough recipients");
        require(_recipients.length < 256, "TokenVesting: too many recipients, max 255");
        for (uint8 i = 0; i < _recipients.length; i++) {
            releaseVestedTokens(_recipients[i]);
        }
    }
}

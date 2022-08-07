pragma solidity ^0.8.0;

//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

//could we use memory for amounts.length?

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}
contract BatchTransfers{


    function batchTransferSimple(IERC20 token, address[] memory recipients, uint256[] memory amounts) public {
        require(recipients.length == amounts.length, "wallets and amounts dont match");
        for(uint256 i = 0; i < recipients.length; i++){
            require(token.transferFrom(msg.sender, recipients[i], amounts[i]), "simple batch transfer failed");
        }
    }

    function batchTransferAdvanced(IERC20 token, address[] memory recipients, uint256[] memory amounts) public {
        require(recipients.length == amounts.length, "wallets and amounts dont match");
        uint256 totalValue;
        for(uint256 i = 0; i < recipients.length; i++){
            totalValue += amounts[i];
        }
        token.transferFrom(msg.sender, address(this), totalValue);

        for(uint256 i = 0; i < recipients.length; i++){
            require(token.transfer(recipients[i], amounts[i]), "advanced batch transfer failed");
        }
    }
}
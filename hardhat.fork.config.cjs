require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

module.exports = {
  solidity: "0.8.34",

  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: "https://ethereum-sepolia-rpc.publicnode.com"
      }
    }
  }
};
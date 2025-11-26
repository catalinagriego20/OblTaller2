import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545", // RPC de Ganache
      accounts: [
        "0x18382a662a81201bfe891cfbcd4bad9b7a7e5ccfc617fb52ecfb6ed31a12f959"
      ],
      chainId: 1337,
    },
  },
};

export default config;

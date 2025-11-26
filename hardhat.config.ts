import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545", // RPC de Ganache
      accounts: [
        "0x7907cf2ed8121548ba84fa3f7043dfbe7431ce238c4e6dbc8797511f44346a93" //PK
      ],
      chainId: 1337,
    },
  },
};

export default config;

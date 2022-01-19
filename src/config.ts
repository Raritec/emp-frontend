import {ChainId} from '@pancakeswap/sdk';
import {Configuration} from './emp-finance/config';
import {BankInfo} from './emp-finance';

const configurations: {[env: string]: Configuration} = {
  // development: {
  //   chainId: 97,
  //   networkName: 'BSC Testnet',
  //   ftmscanUrl: 'https://testnet.bscscan.com/',
  //   defaultProvider: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  //   deployments: require('./emp-finance/deployments/deployments.testing.json'),
  //   externalTokens: {
  //     WBNB: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18],
  //     FUSDT: ['0x55d398326f99059fF775485246999027B3197955', 18], // This is actually BUSD on mainnet not fusdt
  //     ETH: ['0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378', 18],
  //     ZOO: ['0x09e145a1d53c0045f41aeef25d8ff982ae74dd56', 0],
  //     SHIBA: ['0x9ba3e4f84a34df4e08c112e1a0ff148b81655615', 9],
  //     'USDT-BNB-LP': ['0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', 18],
  //     'EMP-ETH-LP': ['0x497D4b031d1A7fB76B75C99Ad0F9c86DbA7657Fb', 18],
  //     'ESHARE-BNB-LP': ['0xa90ccF2E01Be627ef0Ac1533d482E182D56ebe32', 18],
  //   },
  //   baseLaunchDate: new Date('2021-11-21 1:00:00Z'),
  //   bondLaunchesAt: new Date('2020-12-03T15:00:00Z'),
  //   boardroomLaunchesAt: new Date('2020-12-11T00:00:00Z'),
  //   refreshInterval: 10000,
  // },
  development: {
    chainId: 56,
    networkName: 'BSC Mainnet',
    ftmscanUrl: 'https://bscscan.com',
    defaultProvider: 'https://bsc-dataseed.binance.org/',
    deployments: require('./emp-finance/deployments/deployments.mainnet.json'),
    externalTokens: {
      WBNB: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18],
      FUSDT: ['0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 18], // This is actually BUSD on mainnet not fusdt
      ETH: ['0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 18],
      SETH: ['0x1d28cd41fc594232D05F2AbdAFBb556E7F78Dc2a', 18],
      SUSD: ['0x12017c89444624C0268A1053467e22954F4fd362', 18],
      SVL: ['0x37F14E7c2FadC2A01dBD93b8a1F69D41c6c3d554', 18],
      CAKE: ['0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 18],
      ZOO: ['0x09e145a1d53c0045f41aeef25d8ff982ae74dd56', 0],
      SHIBA: ['0x9ba3e4f84a34df4e08c112e1a0ff148b81655615', 9],
      'USDT-BNB-LP': ['0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', 18],
      'USDT-ETH-LP': ['0x3f803ec2b816ea7f06ec76aa2b6f2532f9892d62', 18],
      'EMP-ETH-LP': ['0x84821bb588f049913Dc579Dc511E5e31EB22d5E4', 18],
      // 'EMP-BNB-LP': ['0x369edb1dcffab927b26844159d60e346a1e20017', 18],
      'ESHARE-BNB-LP': ['0x1747AF98EBF0B22d500014c7dd52985d736337d2', 18],
      // 'ESHARE-BNB-APELP': ['0x0dE2a71b2f43CF588A00422d41E1C02D0E08D552', 18],
      // 'EMP-ETH-APELP': ['0xB6E85031F313563bF12ea414118978C8BD78db5D', 18],
    },
    baseLaunchDate: new Date('2022-01-17T23:00:00Z'),
    bondLaunchesAt: new Date('2022-01-31T23:00:00Z'),
    boardroomLaunchesAt: new Date('2022-01-17T00:00:00Z'),
    refreshInterval: 10000,
  },
  production: {
    chainId: 56,
    networkName: 'BSC Mainnet',
    ftmscanUrl: 'https://bscscan.com',
    defaultProvider: 'https://bsc-dataseed.binance.org/',
    deployments: require('./emp-finance/deployments/deployments.mainnet.json'),
    externalTokens: {
      WBNB: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18],
      FUSDT: ['0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', 18], // This is actually BUSD on mainnet not fusdt
      ETH: ['0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 18],
      SETH: ['0x1d28cd41fc594232D05F2AbdAFBb556E7F78Dc2a', 18],
      SUSD: ['0x12017c89444624C0268A1053467e22954F4fd362', 18],
      SVL: ['0x37F14E7c2FadC2A01dBD93b8a1F69D41c6c3d554', 18],
      CAKE: ['0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 18],
      ZOO: ['0x09e145a1d53c0045f41aeef25d8ff982ae74dd56', 0],
      SHIBA: ['0x9ba3e4f84a34df4e08c112e1a0ff148b81655615', 9],
      'USDT-BNB-LP': ['0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16', 18],
      'USDT-ETH-LP': ['0x3f803ec2b816ea7f06ec76aa2b6f2532f9892d62', 18],
      'EMP-ETH-LP': ['0x84821bb588f049913Dc579Dc511E5e31EB22d5E4', 18],
      // 'EMP-BNB-LP': ['0x369edb1dcffab927b26844159d60e346a1e20017', 18],
      'ESHARE-BNB-LP': ['0x1747AF98EBF0B22d500014c7dd52985d736337d2', 18],
      // 'ESHARE-BNB-APELP': ['0x0dE2a71b2f43CF588A00422d41E1C02D0E08D552', 18],
      // 'EMP-ETH-APELP': ['0xB6E85031F313563bF12ea414118978C8BD78db5D', 18],
    },
    baseLaunchDate: new Date('2022-01-17T23:00:00Z'),
    bondLaunchesAt: new Date('2022-01-31T23:00:00Z'),
    boardroomLaunchesAt: new Date('2022-01-17T00:00:00Z'),
    refreshInterval: 10000,
  },
};

export const bankDefinitions: {[contractName: string]: BankInfo} = {
  /*
  Explanation:
  name: description of the card
  poolId: the poolId assigned in the contract
  sectionInUI: way to distinguish in which of the 3 pool groups it should be listed
        - 0 = Single asset stake pools
        - 1 = LP asset staking rewarding EMP
        - 2 = LP asset staking rewarding ESHARE
  contract: the contract name which will be loaded from the deployment.environmnet.json
  depositTokenName : the name of the token to be deposited
  earnTokenName: the rewarded token
  finished: will disable the pool on the UI if set to true
  sort: the order of the pool
  */
  // EmpETHApeLPEmpRewardPool: {
  //   name: 'Earn EMP by EMP-ETH Ape LP',
  //   poolId: 2,
  //   sectionInUI: 1,
  //   contract: 'EmpETHApeLPEmpRewardPool',
  //   depositTokenName: 'EMP-ETH-APELP',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 2,
  //   closedForStaking: true,
  // },



  EmpETHLPEmpRewardPool: {
    name: 'Earn EMP by EMP-ETH LP',
    poolId: 0,
    sectionInUI: 1,
    contract: 'EmpRewardPool',
    depositTokenName: 'EMP-ETH-LP',
    earnTokenName: 'EMP',
    finished: false,
    sort: 2,
    closedForStaking: false,
  },


  
  // EmpCakeRewardPool: {
  //   name: 'Earn EMP by CAKE',
  //   poolId: 0,
  //   sectionInUI: 0,
  //   contract: 'EmpCAKERewardPool',
  //   depositTokenName: 'CAKE',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 3,
  //   closedForStaking: true,
  // },
  // EmpSETHRewardPool: {
  //   name: 'Earn EMP by SETH',
  //   poolId: 2,
  //   sectionInUI: 0,
  //   contract: 'EmpSETHRewardPool',
  //   depositTokenName: 'SETH',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 4,
  //   closedForStaking: true,
  // },
  // EmpSUSDRewardPool: {
  //   name: 'Earn EMP by SUSD',
  //   poolId: 1,
  //   sectionInUI: 0,
  //   contract: 'EmpSUSDRewardPool',
  //   depositTokenName: 'SUSD',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 5,
  //   closedForStaking: true,
  // },
  // EmpSVLRewardPool: {
  //   name: 'Earn EMP by SVL',
  //   poolId: 3,
  //   sectionInUI: 0,
  //   contract: 'EmpSVLRewardPool',
  //   depositTokenName: 'SVL',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 6,
  //   closedForStaking: true,
  // },

  EmpGenesisRewardPool: {
    name: 'Earn EMP by WBNB',
    poolId: 0,
    sectionInUI: 0,
    contract: 'EmpGenesisRewardPool',
    depositTokenName: 'WBNB',
    earnTokenName: 'EMP',
    finished: false,
    sort: 1,
    closedForStaking: false,
  },
  // EmpWBNBGenesisRewardPool: {
  //   name: 'Earn EMP by WBNB',
  //   poolId: 4,
  //   sectionInUI: 0,
  //   contract: 'EmpWBNBGenesisRewardPool',
  //   depositTokenName: 'WBNB',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 1,
  //   closedForStaking: true,
  // },
  // EmpBnbLPRewardPool: {
  //   name: 'Earn EMP by EMP-BNB LP',
  //   poolId: 1,
  //   sectionInUI: 1,
  //   contract: 'EmpBnbLPRewardPool',
  //   depositTokenName: 'EMP-BNB-LP',
  //   earnTokenName: 'EMP',
  //   finished: false,
  //   sort: 8,
  //   closedForStaking: false,
  // },
  // EmpShibaRewardPool: {
  //   name: 'Earn EMP by SHIBA',
  //   poolId: 2,
  //   sectionInUI: 0,
  //   contract: 'EmpShibaGenesisRewardPool',
  //   depositTokenName: 'SHIBA',
  //   earnTokenName: 'EMP',
  //   finished: false,
  //   sort: 3,
  //   closedForStaking: true,
  // },
  // EmpZooRewardPool: {
  //   name: 'Earn EMP by ZOO',
  //   poolId: 3,
  //   sectionInUI: 0,
  //   contract: 'EmpZooGenesisRewardPool',
  //   depositTokenName: 'ZOO',
  //   earnTokenName: 'EMP',
  //   finished: false,
  //   sort: 4,
  //   closedForStaking: true,
  // },

  // EmpFtmLPEmpRewardPoolOld: {
  //   name: 'Earn EMP by EMP-BNB LP',
  //   poolId: 0,
  //   sectionInUI: 1,
  //   contract: 'EmpFtmLpEmpRewardPoolOld',
  //   depositTokenName: 'EMP-BNB-LP',
  //   earnTokenName: 'EMP',
  //   finished: true,
  //   sort: 9,
  //   closedForStaking: true,
  // },
  // EmpFtmLPEShareRewardPool: {
  //   name: 'Earn ESHARE by EMP-BNB LP',
  //   poolId: 0,
  //   sectionInUI: 2,
  //   contract: 'EmpFtmLPEShareRewardPool',
  //   depositTokenName: 'EMP-BNB-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 6,
  //   closedForStaking: false,
  // },



  // EShareBnbEShareRewardPool: {
  //   name: 'Earn ESHARE by ESHARE-BNB LP',
  //   poolId: 0,
  //   sectionInUI: 2,
  //   contract: 'EShareBnbEShareRewardPool',
  //   depositTokenName: 'ESHARE-BNB-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 7,
  //   closedForStaking: false,
  // },
  // EmpEthEShareRewardPool: {
  //   name: 'Earn ESHARE by EMP-ETH LP',
  //   poolId: 1,
  //   sectionInUI: 2,
  //   contract: 'EmpEthEShareRewardPool',
  //   depositTokenName: 'EMP-ETH-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 8,
  //   closedForStaking: false,
  // },



  // EmpEthLPApeEShareRewardPool: {
  //   name: 'Earn ESHARE by EMP-ETH LP',
  //   poolId: 3,
  //   sectionInUI: 2,
  //   contract: 'EmpEthLPApeEShareRewardPool',
  //   depositTokenName: 'EMP-ETH-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 7,
  //   closedForStaking: false,
  // },
  // EshareBnbApeLPEShareRewardPool: {
  //   name: 'Earn ESHARE by ESHARE-BNB Ape LP',
  //   poolId: 2,
  //   sectionInUI: 1,
  //   contract: 'EshareBnbApeLPEShareRewardPool',
  //   depositTokenName: 'ESHARE-BNB-APELP',
  //   earnTokenName: 'ESHARE',
  //   finished: true,
  //   sort: 5,
  //   closedForStaking: true,
  // },
  // EmpEthApeLPEShareRewardPool: {
  //   name: 'Earn ESHARE by EMP-ETH Ape LP',
  //   poolId: 3,
  //   sectionInUI: 2,
  //   contract: 'EmpEthApeLPEShareRewardPool',
  //   depositTokenName: 'EMP-ETH-APELP',
  //   earnTokenName: 'ESHARE',
  //   finished: true,
  //   sort: 4,
  //   closedForStaking: true,
  // },
  // EshareBnbLPEShareRewardPool: {
  //   name: 'Earn ESHARE by ESHARE-BNB LP',
  //   poolId: 0,
  //   sectionInUI: 2,
  //   contract: 'EshareBnbLPEShareRewardPool',
  //   depositTokenName: 'ESHARE-BNB-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 2,
  //   closedForStaking: false,
  // },
  // EmpEthLPEShareRewardPool: {
  //   name: 'Earn ESHARE by EMP-ETH LP',
  //   poolId: 1,
  //   sectionInUI: 2,
  //   contract: 'EmpEthLPEShareRewardPool',
  //   depositTokenName: 'EMP-ETH-LP',
  //   earnTokenName: 'ESHARE',
  //   finished: false,
  //   sort: 1,
  //   closedForStaking: false,
  // },
};

export default configurations[process.env.NODE_ENV || 'development'];

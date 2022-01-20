// import { Fetcher, Route, Token } from '@uniswap/sdk';
//import { Fetcher as FetcherSpirit, Token as TokenSpirit } from '@spiritswap/sdk';
import {Fetcher, Route, Token} from '@pancakeswap/sdk';
import {Configuration} from './config';
import {ContractName, TokenStat, AllocationTime, LPStat, Bank, PoolStats, EShareSwapperStat} from './types';
import {BigNumber, Contract, ethers, EventFilter} from 'ethers';
import {decimalToBalance} from './ether-utils';
import {TransactionResponse} from '@ethersproject/providers';
import ERC20 from './ERC20';
import {getFullDisplayBalance, getDisplayBalance} from '../utils/formatBalance';
import {getDefaultProvider} from '../utils/provider';
import IUniswapV2PairABI from './IUniswapV2Pair.abi.json';
import config, {bankDefinitions} from '../config';
import moment from 'moment';
import {parseUnits} from 'ethers/lib/utils';
import {BNB_TICKER, SPOOKY_ROUTER_ADDR, EMP_TICKER} from '../utils/constants';
/**
 * An API module of Emp Money contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export class EmpFinance {
  myAccount: string;
  provider: ethers.providers.Web3Provider;
  signer?: ethers.Signer;
  config: Configuration;
  contracts: {[name: string]: Contract};
  externalTokens: {[name: string]: ERC20};
  boardroomVersionOfUser?: string;

  EMPETH_LP: Contract;
  EMP: ERC20;
  ESHARE: ERC20;
  EBOND: ERC20;
  BNB: ERC20;
  ETH: ERC20;

  constructor(cfg: Configuration) {
    const {deployments, externalTokens} = cfg;
    const provider = getDefaultProvider();

    // loads contracts from deployments
    this.contracts = {};
    for (const [name, deployment] of Object.entries(deployments)) {
      this.contracts[name] = new Contract(deployment.address, deployment.abi, provider);
    }
    this.externalTokens = {};
    for (const [symbol, [address, decimal]] of Object.entries(externalTokens)) {
      this.externalTokens[symbol] = new ERC20(address, provider, symbol, decimal);
    }
    this.EMP = new ERC20(deployments.Emp.address, provider, 'EMP');
    this.ESHARE = new ERC20(deployments.EShare.address, provider, 'ESHARE');
    this.EBOND = new ERC20(deployments.EBond.address, provider, 'EBOND');
    this.BNB = this.externalTokens['WBNB'];
    this.ETH = this.externalTokens['ETH'];

    // Uniswap V2 Pair
    this.EMPETH_LP = new Contract(externalTokens['EMP-ETH-LP'][0], IUniswapV2PairABI, provider);

    this.config = cfg;
    this.provider = provider;
  }

  /**
   * @param provider From an unlocked wallet. (e.g. Metamask)
   * @param account An address of unlocked wallet account.
   */
  unlockWallet(provider: any, account: string) {
    const newProvider = new ethers.providers.Web3Provider(provider, this.config.chainId);
    this.signer = newProvider.getSigner(0);
    this.myAccount = account;
    for (const [name, contract] of Object.entries(this.contracts)) {
      this.contracts[name] = contract.connect(this.signer);
    }
    const tokens = [this.EMP, this.ESHARE, this.EBOND, ...Object.values(this.externalTokens)];
    for (const token of tokens) {
      token.connect(this.signer);
    }
    this.EMPETH_LP = this.EMPETH_LP.connect(this.signer);
    console.log(`🔓 Wallet is unlocked. Welcome, ${account}!`);
    this.fetchBoardroomVersionOfUser()
      .then((version) => (this.boardroomVersionOfUser = version))
      .catch((err) => {
        console.error(`Failed to fetch boardroom version: ${err.stack}`);
        this.boardroomVersionOfUser = 'latest';
      });
  }

  get isUnlocked(): boolean {
    return !!this.myAccount;
  }

  //===================================================================
  //===================== GET ASSET STATS =============================
  //===================FROM APE TO DISPLAY =========================
  //=========================IN HOME PAGE==============================
  //===================================================================

  async getEmpStat(): Promise<TokenStat> {
    const {EmpRewardPool, EmpGenesisRewardPool} = this.contracts;
    const supply = await this.EMP.totalSupply();
    const empRewardPoolSupply = await this.EMP.balanceOf(EmpGenesisRewardPool.address);
    const empRewardPoolSupply2 = await this.EMP.balanceOf(EmpRewardPool.address);
    const oldTreasurySupply = await this.EMP.balanceOf('0xA605b764Bc0C34Dc45dCF89e6225FF0492978F13');
    const oldBoardroomSupply = await this.EMP.balanceOf('0xD90a4D22a3B406A7e9f59d2c295C2D8554CD88B0');
    const burnSupply = await this.EMP.balanceOf('0x0000000000000000000000000000000000000000');
    const empCirculatingSupply = supply.sub(empRewardPoolSupply).sub(empRewardPoolSupply2).sub(oldTreasurySupply).sub(oldBoardroomSupply).sub(burnSupply);
    // const priceInBNB = await this.getTokenPriceFromPancakeswap(this.EMP);
    const priceInETH = await this.getTokenPriceFromPancakeswapETH(this.EMP);
    // const priceOfOneBNB = await this.getWBNBPriceFromPancakeswap();
    const priceOfOneETH = await this.getETHPriceFromPancakeswap();
    // const priceInDollars = await this.getTokenPriceFromPancakeswapEMPUSD();
    const priceOfEmpInDollars = ((Number(priceInETH) * Number(priceOfOneETH)) / 4000).toFixed(2);
    //console.log('priceOfEmpInDollars', priceOfEmpInDollars);

    return {
      //  tokenInFtm: (Number(priceInBNB) * 100).toString(),
      tokenInFtm: priceInETH ? priceInETH.toString() : '0',
      priceInDollars: priceOfEmpInDollars,
      totalSupply: getDisplayBalance(supply, this.EMP.decimal, 0),
      circulatingSupply: getDisplayBalance(empCirculatingSupply, this.EMP.decimal, 0),
    };
  }

  async getETHPriceUSD(): Promise<Number> {
    const priceOfOneETH = await this.getETHPriceFromPancakeswap();
    return Number(priceOfOneETH);
  }

  /**
   * Calculates various stats for the requested LP
   * @param name of the LP token to load stats for
   * @returns
   */
  async getLPStat(name: string): Promise<LPStat> {
    const lpToken = this.externalTokens[name];
    const lpTokenSupplyBN = await lpToken.totalSupply();
    const lpTokenSupply = getDisplayBalance(lpTokenSupplyBN, 18);
    const token0 = name.startsWith('EMP') ? this.EMP : this.ESHARE;
    const isEmp = name.startsWith('EMP');
    const tokenAmountBN = await token0.balanceOf(lpToken.address);
    const tokenAmount = getDisplayBalance(tokenAmountBN, 18);

    const ftmAmountBN = await this.BNB.balanceOf(lpToken.address);
    const ftmAmount = getDisplayBalance(ftmAmountBN, 18);
    const tokenAmountInOneLP = Number(tokenAmount) / Number(lpTokenSupply);
    const ftmAmountInOneLP = Number(ftmAmount) / Number(lpTokenSupply);
    const lpTokenPrice = await this.getLPTokenPrice(lpToken, token0, isEmp);
    const lpTokenPriceFixed = Number(lpTokenPrice).toFixed(2).toString();
    const liquidity = (Number(lpTokenSupply) * Number(lpTokenPrice)).toFixed(2).toString();
    return {
      tokenAmount: tokenAmountInOneLP.toFixed(2).toString(),
      ftmAmount: ftmAmountInOneLP.toFixed(2).toString(),
      priceOfOne: lpTokenPriceFixed,
      totalLiquidity: liquidity,
      totalSupply: Number(lpTokenSupply).toFixed(2).toString(),
    };
  }

  async getLPStatETH(name: string): Promise<LPStat> {
    const lpToken = this.externalTokens[name];
    const lpTokenSupplyBN = await lpToken.totalSupply();
    const lpTokenSupply = getDisplayBalance(lpTokenSupplyBN, 18);
    const token0 = name.startsWith('EMP') ? this.EMP : this.ESHARE;
    const isEmp = name.startsWith('EMP');
    const tokenAmountBN = await token0.balanceOf(lpToken.address);
    const tokenAmount = getDisplayBalance(tokenAmountBN, 18);

    const btcAmountBN = await this.ETH.balanceOf(lpToken.address);
    const btcAmount = getDisplayBalance(btcAmountBN, 18);
    const tokenAmountInOneLP = Number(tokenAmount) / Number(lpTokenSupply);
    const ftmAmountInOneLP = Number(btcAmount) / Number(lpTokenSupply);
    const lpTokenPrice = await this.getLPTokenPrice(lpToken, token0, isEmp);

    const lpTokenPriceFixed = Number(lpTokenPrice).toFixed(2).toString();

    const liquidity = (Number(lpTokenSupply) * Number(lpTokenPrice)).toFixed(2).toString();

    return {
      tokenAmount: tokenAmountInOneLP.toFixed(2).toString(),
      ftmAmount: ftmAmountInOneLP.toFixed(5).toString(),
      priceOfOne: lpTokenPriceFixed,
      totalLiquidity: liquidity,
      totalSupply: Number(lpTokenSupply).toFixed(2).toString(),
    };
  }
  /**
   * Use this method to get price for Emp
   * @returns TokenStat for EBOND
   * priceInBNB
   * priceInDollars
   * TotalSupply
   * CirculatingSupply (always equal to total supply for bonds)
   */
  async getBondStat(): Promise<TokenStat> {
    const {Treasury} = this.contracts;
    const empStat = await this.getEmpStat();
    const bondEmpRatioBN = await Treasury.getBondPremiumRate();
    const modifier = bondEmpRatioBN / 1e18 > 1 ? bondEmpRatioBN / 1e18 : 1;
    const bondPriceInBNB = (Number(empStat.tokenInFtm) * modifier).toFixed(2);
    const priceOfEBondInDollars = (Number(empStat.priceInDollars) * modifier).toFixed(2);
    const supply = await this.EBOND.displayedTotalSupply();
    return {
      tokenInFtm: bondPriceInBNB,
      priceInDollars: priceOfEBondInDollars,
      totalSupply: supply,
      circulatingSupply: supply,
    };
  }

  /**
   * @returns TokenStat for ESHARE
   * priceInBNB
   * priceInDollars
   * TotalSupply
   * CirculatingSupply (always equal to total supply for bonds)
   */
  async getShareStat(): Promise<TokenStat> {
    const {EShareRewardPool} = this.contracts;

    const supply = await this.ESHARE.totalSupply();

    const priceInBNB = await this.getTokenPriceFromPancakeswap(this.ESHARE);
    const empRewardPoolSupply = await this.ESHARE.balanceOf(EShareRewardPool.address);
    const tShareCirculatingSupply = supply.sub(empRewardPoolSupply);
    const priceOfOneBNB = await this.getWBNBPriceFromPancakeswap();
    const priceOfSharesInDollars = (Number(priceInBNB) * Number(priceOfOneBNB)).toFixed(2);

    return {
      tokenInFtm: priceInBNB,
      priceInDollars: priceOfSharesInDollars,
      totalSupply: getDisplayBalance(supply, this.ESHARE.decimal, 0),
      circulatingSupply: getDisplayBalance(tShareCirculatingSupply, this.ESHARE.decimal, 0),
    };
  }

  async getEmpStatInEstimatedTWAP(): Promise<TokenStat> {
    const {Oracle, EmpRewardPool} = this.contracts;
    const expectedPrice = await Oracle.twap(this.EMP.address, ethers.utils.parseEther('4000'));

    const supply = await this.EMP.totalSupply();
    const empRewardPoolSupply = await this.EMP.balanceOf(EmpRewardPool.address);
    const empCirculatingSupply = supply.sub(empRewardPoolSupply);
    return {
      tokenInFtm: getDisplayBalance(expectedPrice),
      priceInDollars: getDisplayBalance(expectedPrice),
      totalSupply: getDisplayBalance(supply, this.EMP.decimal, 0),
      circulatingSupply: getDisplayBalance(empCirculatingSupply, this.EMP.decimal, 0),
    };
  }

  async getEmpPriceInLastTWAP(): Promise<BigNumber> {
    const {Treasury} = this.contracts;
    return Treasury.getEmpUpdatedPrice();
  }

  // async getEmpPegTWAP(): Promise<any> {
  //   const { Treasury } = this.contracts;
  //   const updatedPrice = Treasury.getEmpUpdatedPrice();
  //   const updatedPrice2 = updatedPrice * 10000;
  //   return updatedPrice2;
  // }

  async getBondsPurchasable(): Promise<BigNumber> {
    const {Treasury} = this.contracts;
    // const burnableEmp = (Number(Treasury.getBurnableEmpLeft()) * 1000).toFixed(2).toString();
    return Treasury.getBurnableEmpLeft();
  }

  /**
   * Calculates the TVL, APR and daily APR of a provided pool/bank
   * @param bank
   * @returns
   */
  async getPoolAPRs(bank: Bank): Promise<PoolStats> {
    if (this.myAccount === undefined) return;
    const depositToken = bank.depositToken;
    const poolContract = this.contracts[bank.contract];
    const depositTokenPrice = await this.getDepositTokenPriceInDollars(bank.depositTokenName, depositToken);
    const stakeInPool = await depositToken.balanceOf(bank.address);
    const TVL = Number(depositTokenPrice) * Number(getDisplayBalance(stakeInPool, depositToken.decimal));
    const stat = bank.earnTokenName === 'EMP' ? await this.getEmpStat() : await this.getShareStat();
    const tokenPerSecond = await this.getTokenPerSecond(
      bank.earnTokenName,
      bank.contract,
      poolContract,
      bank.depositTokenName,
    );

    const tokenPerHour = tokenPerSecond.mul(60).mul(60);
    const totalRewardPricePerYear =
      Number(stat.priceInDollars) * Number(getDisplayBalance(tokenPerHour.mul(24).mul(365)));
    const totalRewardPricePerDay = Number(stat.priceInDollars) * Number(getDisplayBalance(tokenPerHour.mul(24)));
    const totalStakingTokenInPool =
      Number(depositTokenPrice) * Number(getDisplayBalance(stakeInPool, depositToken.decimal));
    const dailyAPR = (totalRewardPricePerDay / totalStakingTokenInPool) * 100;
    const yearlyAPR = (totalRewardPricePerYear / totalStakingTokenInPool) * 100;
    return {
      dailyAPR: dailyAPR.toFixed(2).toString(),
      yearlyAPR: yearlyAPR.toFixed(2).toString(),
      TVL: TVL.toFixed(2).toString(),
    };
  }

  /**
   * Method to return the amount of tokens the pool yields per second
   * @param earnTokenName the name of the token that the pool is earning
   * @param contractName the contract of the pool/bank
   * @param poolContract the actual contract of the pool
   * @returns
   */
  async getTokenPerSecond(
    earnTokenName: string,
    contractName: string,
    poolContract: Contract,
    depositTokenName: string,
  ) {
    if (contractName.endsWith('GenesisRewardPool')) {
      return await poolContract.empPerSecond();
    }
    if (earnTokenName === 'EMP') {
      if (!contractName.endsWith('EmpRewardPool')) {
        const rewardPerSecond = await poolContract.tSharePerSecond();
        if (depositTokenName === 'WBNB') {
          return rewardPerSecond.mul(6000).div(11000).div(24);
        } else if (depositTokenName === 'CAKE') {
          return rewardPerSecond.mul(2500).div(11000).div(24);
        } else if (depositTokenName === 'SUSD') {
          return rewardPerSecond.mul(1000).div(11000).div(24);
        } else if (depositTokenName === 'SVL') {
          return rewardPerSecond.mul(1500).div(11000).div(24);
        }
        return rewardPerSecond.div(24);
      }
      const poolStartTime = await poolContract.poolStartTime();
      const startDateTime = new Date(poolStartTime.toNumber() * 1000);
      const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
      if (Date.now() - startDateTime.getTime() > FOUR_DAYS) {
        return await poolContract.epochEmpPerSecond(1);
      }
      return await poolContract.epochEmpPerSecond(0);
    }
    const rewardPerSecond = await poolContract.tSharePerSecond();
    if (depositTokenName.startsWith('EMP')) {
      return rewardPerSecond.mul(11900).div(23800);
    } else {
      return rewardPerSecond.mul(11900).div(23800);
    }
  }

  /**
   * Method to calculate the tokenPrice of the deposited asset in a pool/bank
   * If the deposited token is an LP it will find the price of its pieces
   * @param tokenName
   * @param pool
   * @param token
   * @returns
   */
  async getDepositTokenPriceInDollars(tokenName: string, token: ERC20) {
    let tokenPrice;
    const priceOfOneFtmInDollars = await this.getWBNBPriceFromPancakeswap();
    if (tokenName === 'WBNB') {
      tokenPrice = priceOfOneFtmInDollars;
    } else {
      if (tokenName === 'EMP-ETH-LP') {
        tokenPrice = await this.getLPTokenPrice(token, this.EMP, true);
      } else if (tokenName === 'ESHARE-BNB-LP') {
        tokenPrice = await this.getLPTokenPrice(token, this.ESHARE, false);
      } else if (tokenName === 'ESHARE-BNB-APELP') {
        tokenPrice = await this.getApeLPTokenPrice(token, this.ESHARE, false);
      } else if (tokenName === 'EMP-ETH-APELP') {
        tokenPrice = await this.getApeLPTokenPrice(token, this.EMP, true);
      } else {
        tokenPrice = await this.getTokenPriceFromPancakeswap(token);
        tokenPrice = (Number(tokenPrice) * Number(priceOfOneFtmInDollars)).toString();
      }
    }
    return tokenPrice;
  }

  //===================================================================
  //===================== GET ASSET STATS =============================
  //=========================== END ===================================
  //===================================================================

  async getCurrentEpoch(): Promise<BigNumber> {
    const {Treasury} = this.contracts;
    return Treasury.epoch();
  }

  async getBondOraclePriceInLastTWAP(): Promise<BigNumber> {
    const {Treasury} = this.contracts;
    return Treasury.getBondPremiumRate();
  }

  /**
   * Buy bonds with cash.
   * @param amount amount of cash to purchase bonds with.
   */
  async buyBonds(amount: string | number): Promise<TransactionResponse> {
    const {Treasury} = this.contracts;
    const treasuryEmpPrice = await Treasury.getEmpPrice();
    return await Treasury.buyBonds(decimalToBalance(amount), treasuryEmpPrice);
  }

  /**
   * Redeem bonds for cash.
   * @param amount amount of bonds to redeem.
   */
  async redeemBonds(amount: string): Promise<TransactionResponse> {
    const {Treasury} = this.contracts;
    const priceForEmp = await Treasury.getEmpPrice();
    return await Treasury.redeemBonds(decimalToBalance(amount), priceForEmp);
  }

  async getTotalValueLocked(): Promise<Number> {
    let totalValue = 0;
    for (const bankInfo of Object.values(bankDefinitions)) {
      const pool = this.contracts[bankInfo.contract];
      const token = this.externalTokens[bankInfo.depositTokenName];
      const tokenPrice = await this.getDepositTokenPriceInDollars(bankInfo.depositTokenName, token);
      const tokenAmountInPool = await token.balanceOf(pool.address);
      const value = Number(getDisplayBalance(tokenAmountInPool, token.decimal)) * Number(tokenPrice);
      const poolValue = Number.isNaN(value) ? 0 : value;
      totalValue += poolValue;
    }

    const ESHAREPrice = (await this.getShareStat()).priceInDollars;
    const boardroomtShareBalanceOf = await this.ESHARE.balanceOf(this.currentBoardroom().address);
    const boardroomTVL = Number(getDisplayBalance(boardroomtShareBalanceOf, this.ESHARE.decimal)) * Number(ESHAREPrice);

    return totalValue + boardroomTVL;
  }

  /**
   * Calculates the price of an LP token
   * Reference https://github.com/DefiDebauchery/discordpricebot/blob/4da3cdb57016df108ad2d0bb0c91cd8dd5f9d834/pricebot/pricebot.py#L150
   * @param lpToken the token under calculation
   * @param token the token pair used as reference (the other one would be BNB in most cases)
   * @param isEmp sanity check for usage of emp token or tShare
   * @returns price of the LP token
   */
  async getLPTokenPrice(lpToken: ERC20, token: ERC20, isEmp: boolean): Promise<string> {
    const totalSupply = getFullDisplayBalance(await lpToken.totalSupply(), lpToken.decimal);
    //Get amount of tokenA
    const tokenSupply = getFullDisplayBalance(await token.balanceOf(lpToken.address), token.decimal);
    const stat = isEmp === true ? await this.getEmpStat() : await this.getShareStat();
    const priceOfToken = stat.priceInDollars;
    const tokenInLP = Number(tokenSupply) / Number(totalSupply);
    const tokenPrice = (Number(priceOfToken) * tokenInLP * 2) //We multiply by 2 since half the price of the lp token is the price of each piece of the pair. So twice gives the total
      .toString();
    return tokenPrice;
  }

  /**
   * Calculates the price of an LP token
   * Reference https://github.com/DefiDebauchery/discordpricebot/blob/4da3cdb57016df108ad2d0bb0c91cd8dd5f9d834/pricebot/pricebot.py#L150
   * @param lpToken the token under calculation
   * @param token the token pair used as reference (the other one would be BNB in most cases)
   * @param isEmp sanity check for usage of emp token or tShare
   * @returns price of the LP token
   */
  async getApeLPTokenPrice(lpToken: ERC20, token: ERC20, isEmp: boolean): Promise<string> {
    const totalSupply = getFullDisplayBalance(await lpToken.totalSupply(), lpToken.decimal);
    //Get amount of tokenA
    const tokenSupply = getFullDisplayBalance(await token.balanceOf(lpToken.address), token.decimal);
    const stat = isEmp === true ? await this.getEmpStat() : await this.getShareStat();
    const priceOfToken = stat.priceInDollars;
    const tokenInLP = Number(tokenSupply) / Number(totalSupply);
    const tokenPrice = (Number(priceOfToken) * tokenInLP * 2) //We multiply by 2 since half the price of the lp token is the price of each piece of the pair. So twice gives the total
      .toString();
    return tokenPrice;
  }

  async earnedFromBank(
    poolName: ContractName,
    earnTokenName: String,
    poolId: Number,
    account = this.myAccount,
  ): Promise<BigNumber> {
    const pool = this.contracts[poolName];
    try {
      if (earnTokenName === 'EMP') {
        return await pool.pendingEMP(poolId, account);
      } else {
        return await pool.pendingShare(poolId, account);
      }
    } catch (err) {
      console.error(`Failed to call pendingShare() on pool ${pool.address}: ${err.stack}`);
      return BigNumber.from(0);
    }
  }

  async stakedBalanceOnBank(poolName: ContractName, poolId: Number, account = this.myAccount): Promise<BigNumber> {
    const pool = this.contracts[poolName];
    try {
      let userInfo = await pool.userInfo(poolId, account);
      return await userInfo.amount;
    } catch (err) {
      console.error(`Failed to call userInfo() on pool ${pool.address}: ${err.stack}`);
      return BigNumber.from(0);
    }
  }

  /**
   * Deposits token to given pool.
   * @param poolName A name of pool contract.
   * @param amount Number of tokens with decimals applied. (e.g. 1.45 DAI * 10^18)
   * @returns {string} Transaction hash
   */
  async stake(poolName: ContractName, poolId: Number, amount: BigNumber): Promise<TransactionResponse> {
    const pool = this.contracts[poolName];
    return await pool.deposit(poolId, amount);
  }

  /**
   * Withdraws token from given pool.
   * @param poolName A name of pool contract.
   * @param amount Number of tokens with decimals applied. (e.g. 1.45 DAI * 10^18)
   * @returns {string} Transaction hash
   */
  async unstake(poolName: ContractName, poolId: Number, amount: BigNumber): Promise<TransactionResponse> {
    const pool = this.contracts[poolName];
    return await pool.withdraw(poolId, amount);
  }

  /**
   * Transfers earned token reward from given pool to my account.
   */
  async harvest(poolName: ContractName, poolId: Number): Promise<TransactionResponse> {
    const pool = this.contracts[poolName];
    //By passing 0 as the amount, we are asking the contract to only redeem the reward and not the currently staked token
    return await pool.withdraw(poolId, 0);
  }

  /**
   * Harvests and withdraws deposited tokens from the pool.
   */
  async exit(poolName: ContractName, poolId: Number, account = this.myAccount): Promise<TransactionResponse> {
    const pool = this.contracts[poolName];
    let userInfo = await pool.userInfo(poolId, account);
    return await pool.withdraw(poolId, userInfo.amount);
  }

  async fetchBoardroomVersionOfUser(): Promise<string> {
    return 'latest';
  }

  currentBoardroom(): Contract {
    if (!this.boardroomVersionOfUser) {
      //throw new Error('you must unlock the wallet to continue.');
    }
    return this.contracts.Boardroom;
  }

  isOldBoardroomMember(): boolean {
    return this.boardroomVersionOfUser !== 'latest';
  }

  async getTokenPriceFromPancakeswap(tokenContract: ERC20): Promise<string> {
    const ready = await this.provider.ready;
    if (!ready) return;
    // const { chainId } = this.config;
    const {WBNB} = this.config.externalTokens;

    const wftm = new Token(56, WBNB[0], WBNB[1], 'WBNB');
    const token = new Token(56, tokenContract.address, tokenContract.decimal, tokenContract.symbol);
    try {
      const wftmToToken = await Fetcher.fetchPairData(wftm, token, this.provider);
      const priceInBUSD = new Route([wftmToToken], token);
      return priceInBUSD.midPrice.toFixed(4);
    } catch (err) {
      console.error(`Failed to fetch token price of ${tokenContract.symbol}: ${err}`);
    }
  }

  async getTokenPriceFromPancakeswapETH(tokenContract: ERC20): Promise<string> {
    const ready = await this.provider.ready;
    if (!ready) return;
    // const { chainId } = this.config;
    const {ETH, WBNB} = this.config.externalTokens;

    const wbnb = new Token(56, WBNB[0], WBNB[1]);
    const eth = new Token(56, this.ETH.address, this.ETH.decimal, 'ETH', 'ETH');
    const token = new Token(56, tokenContract.address, tokenContract.decimal, tokenContract.symbol);
    try {
      const wftmToToken = await Fetcher.fetchPairData(eth, token, this.provider);
      const priceInBUSD = new Route([wftmToToken], token);
      //   console.log('priceInBUSDETH', priceInBUSD.midPrice.toFixed(12));

      const priceForPeg = Number(priceInBUSD.midPrice.toFixed(12)) * 4000;
      return priceForPeg.toFixed(4);
    } catch (err) {
      console.error(`Failed to fetch token price of ${tokenContract.symbol}: ${err}`);
    }
  }

  async getTokenPriceFromPancakeswapEMPUSD(): Promise<string> {
    const ready = await this.provider.ready;
    if (!ready) return;
    // const { chainId } = this.config;
    const {EMP, WBNB} = this.config.externalTokens;

    const wbnb = new Token(56, WBNB[0], WBNB[1]);
    const eth = new Token(56, this.ETH.address, this.ETH.decimal, 'ETH', 'ETH');
    const token = new Token(56, this.EMP.address, this.EMP.decimal, this.EMP.symbol);
    try {
      const wftmToToken = await Fetcher.fetchPairData(eth, token, this.provider);
      const priceInBUSD = new Route([wftmToToken], token);
      // console.log('test', priceInBUSD.midPrice.toFixed(12));

      const priceForPeg = Number(priceInBUSD.midPrice.toFixed(12)) * 4000;
      return priceForPeg.toFixed(4);
    } catch (err) {
      console.error(`Failed to fetch token price of ${this.EMP.symbol}: ${err}`);
    }
  }

  // async getTokenPriceFromSpiritswap(tokenContract: ERC20): Promise<string> {
  //   const ready = await this.provider.ready;
  //   if (!ready) return;
  //   const { chainId } = this.config;

  //   const { WBNB } = this.externalTokens;

  //   const wftm = new TokenSpirit(chainId, WBNB.address, WBNB.decimal);
  //   const token = new TokenSpirit(chainId, tokenContract.address, tokenContract.decimal, tokenContract.symbol);
  //   try {
  //     const wftmToToken = await FetcherSpirit.fetchPairData(wftm, token, this.provider);
  //     const liquidityToken = wftmToToken.liquidityToken;
  //     let ftmBalanceInLP = await WBNB.balanceOf(liquidityToken.address);
  //     let ftmAmount = Number(getFullDisplayBalance(ftmBalanceInLP, WBNB.decimal));
  //     let shibaBalanceInLP = await tokenContract.balanceOf(liquidityToken.address);
  //     let shibaAmount = Number(getFullDisplayBalance(shibaBalanceInLP, tokenContract.decimal));
  //     const priceOfOneFtmInDollars = await this.getWBNBPriceFromPancakeswap();
  //     let priceOfShiba = (ftmAmount / shibaAmount) * Number(priceOfOneFtmInDollars);
  //     return priceOfShiba.toString();
  //   } catch (err) {
  //     console.error(`Failed to fetch token price of ${tokenContract.symbol}: ${err}`);
  //   }
  // }

  async getWBNBPriceFromPancakeswap(): Promise<string> {
    const ready = await this.provider.ready;
    if (!ready) return;
    const {WBNB, FUSDT} = this.externalTokens;
    try {
      const fusdt_wftm_lp_pair = this.externalTokens['USDT-BNB-LP'];
      let ftm_amount_BN = await WBNB.balanceOf(fusdt_wftm_lp_pair.address);
      let ftm_amount = Number(getFullDisplayBalance(ftm_amount_BN, WBNB.decimal));
      let fusdt_amount_BN = await FUSDT.balanceOf(fusdt_wftm_lp_pair.address);
      let fusdt_amount = Number(getFullDisplayBalance(fusdt_amount_BN, FUSDT.decimal));
      return (fusdt_amount / ftm_amount).toString();
    } catch (err) {
      console.error(`Failed to fetch token price of WBNB: ${err}`);
    }
  }

  async getETHPriceFromPancakeswap(): Promise<string> {
    const ready = await this.provider.ready;
    if (!ready) return;
    const {ETH} = this.externalTokens;
    try {
      const btcPriceInBNB = await this.getTokenPriceFromPancakeswap(ETH);

      const wbnbPrice = await this.getWBNBPriceFromPancakeswap();

      const btcprice = (Number(btcPriceInBNB) * Number(wbnbPrice)).toFixed(2).toString();
      //console.log('btcprice', btcprice);
      return btcprice;
    } catch (err) {
      console.error(`Failed to fetch token price of ETH: ${err}`);
    }
  }

  // async getETHPriceFromPancakeswap(): Promise<string> {
  //   const ready = await this.provider.ready;
  //   if (!ready) return;
  //   const { ETH, FUSDT } = this.externalTokens;
  //   try {
  //     const fusdt_eth_lp_pair = this.externalTokens['USDT-ETH-LP'];
  //     let ftm_amount_BN = await ETH.balanceOf(fusdt_eth_lp_pair.address);
  //     let ftm_amount = Number(getFullDisplayBalance(ftm_amount_BN, ETH.decimal));
  //     let fusdt_amount_BN = await FUSDT.balanceOf(fusdt_eth_lp_pair.address);
  //     let fusdt_amount = Number(getFullDisplayBalance(fusdt_amount_BN, FUSDT.decimal));
  //     console.log('ETH price', (fusdt_amount / ftm_amount).toString());
  //     return (fusdt_amount / ftm_amount).toString();
  //     console.log('ETH price');
  //   } catch (err) {
  //     console.error(`Failed to fetch token price of ETH: ${err}`);
  //   }
  // }

  //===================================================================
  //===================================================================
  //===================== MASONRY METHODS =============================
  //===================================================================
  //===================================================================

  async getBoardroomAPR() {
    const Boardroom = this.currentBoardroom();
    const latestSnapshotIndex = await Boardroom.latestSnapshotIndex();
    const lastHistory = await Boardroom.boardroomHistory(latestSnapshotIndex);

    const lastRewardsReceived = lastHistory[1];

    const ESHAREPrice = (await this.getShareStat()).priceInDollars;
    const EMPPrice = (await this.getEmpStat()).priceInDollars;
    const epochRewardsPerShare = lastRewardsReceived / 1e18;

    //Mgod formula
    const amountOfRewardsPerDay = epochRewardsPerShare * Number(EMPPrice) * 4;
    const boardroomtShareBalanceOf = await this.ESHARE.balanceOf(Boardroom.address);
    const boardroomTVL = Number(getDisplayBalance(boardroomtShareBalanceOf, this.ESHARE.decimal)) * Number(ESHAREPrice);
    const realAPR = ((amountOfRewardsPerDay * 100) / boardroomTVL) * 365;
    return realAPR;
  }

  /**
   * Checks if the user is allowed to retrieve their reward from the Boardroom
   * @returns true if user can withdraw reward, false if they can't
   */
  async canUserClaimRewardFromBoardroom(): Promise<boolean> {
    const Boardroom = this.currentBoardroom();
    return await Boardroom.canClaimReward(this.myAccount);
  }

  /**
   * Checks if the user is allowed to retrieve their reward from the Boardroom
   * @returns true if user can withdraw reward, false if they can't
   */
  async canUserUnstakeFromBoardroom(): Promise<boolean> {
    const Boardroom = this.currentBoardroom();
    const canWithdraw = await Boardroom.canWithdraw(this.myAccount);
    const stakedAmount = await this.getStakedSharesOnBoardroom();
    const notStaked = Number(getDisplayBalance(stakedAmount, this.ESHARE.decimal)) === 0;
    const result = notStaked ? true : canWithdraw;
    return result;
  }

  async timeUntilClaimRewardFromBoardroom(): Promise<BigNumber> {
    // const Boardroom = this.currentBoardroom();
    // const mason = await Boardroom.masons(this.myAccount);
    return BigNumber.from(0);
  }

  async getTotalStakedInBoardroom(): Promise<BigNumber> {
    const Boardroom = this.currentBoardroom();
    return await Boardroom.totalSupply();
  }

  async stakeShareToBoardroom(amount: string): Promise<TransactionResponse> {
    if (this.isOldBoardroomMember()) {
      throw new Error("you're using old boardroom. please withdraw and deposit the ESHARE again.");
    }
    const Boardroom = this.currentBoardroom();
    return await Boardroom.stake(decimalToBalance(amount));
  }

  async getStakedSharesOnBoardroom(): Promise<BigNumber> {
    const Boardroom = this.currentBoardroom();
    if (this.boardroomVersionOfUser === 'v1') {
      return await Boardroom.getShareOf(this.myAccount);
    }
    return await Boardroom.balanceOf(this.myAccount);
  }

  async getEarningsOnBoardroom(): Promise<BigNumber> {
    const Boardroom = this.currentBoardroom();
    if (this.boardroomVersionOfUser === 'v1') {
      return await Boardroom.getCashEarningsOf(this.myAccount);
    }
    return await Boardroom.earned(this.myAccount);
  }

  async withdrawShareFromBoardroom(amount: string): Promise<TransactionResponse> {
    const Boardroom = this.currentBoardroom();
    return await Boardroom.withdraw(decimalToBalance(amount));
  }

  async harvestCashFromBoardroom(): Promise<TransactionResponse> {
    const Boardroom = this.currentBoardroom();
    if (this.boardroomVersionOfUser === 'v1') {
      return await Boardroom.claimDividends();
    }
    return await Boardroom.claimReward();
  }

  async exitFromBoardroom(): Promise<TransactionResponse> {
    const Boardroom = this.currentBoardroom();
    return await Boardroom.exit();
  }

  async getTreasuryNextAllocationTime(): Promise<AllocationTime> {
    const {Treasury} = this.contracts;
    const nextEpochTimestamp: BigNumber = await Treasury.nextEpochPoint();
    const nextAllocation = new Date(nextEpochTimestamp.mul(1000).toNumber());
    const prevAllocation = new Date(Date.now());

    return {from: prevAllocation, to: nextAllocation};
  }
  /**
   * This method calculates and returns in a from to to format
   * the period the user needs to wait before being allowed to claim
   * their reward from the boardroom
   * @returns Promise<AllocationTime>
   */
  async getUserClaimRewardTime(): Promise<AllocationTime> {
    const {Boardroom, Treasury} = this.contracts;
    const nextEpochTimestamp = await Boardroom.nextEpochPoint(); //in unix timestamp
    const currentEpoch = await Boardroom.epoch();
    const mason = await Boardroom.members(this.myAccount);
    const startTimeEpoch = mason.epochTimerStart;
    const period = await Treasury.PERIOD();
    const periodInHours = period / 60 / 60; // 6 hours, period is displayed in seconds which is 21600
    const rewardLockupEpochs = await Boardroom.rewardLockupEpochs();
    const targetEpochForClaimUnlock = Number(startTimeEpoch) + Number(rewardLockupEpochs);

    const fromDate = new Date(Date.now());
    if (targetEpochForClaimUnlock - currentEpoch <= 0) {
      return {from: fromDate, to: fromDate};
    } else if (targetEpochForClaimUnlock - currentEpoch === 1) {
      const toDate = new Date(nextEpochTimestamp * 1000);
      return {from: fromDate, to: toDate};
    } else {
      const toDate = new Date(nextEpochTimestamp * 1000);
      const delta = targetEpochForClaimUnlock - currentEpoch - 1;
      const endDate = moment(toDate)
        .add(delta * periodInHours, 'hours')
        .toDate();
      return {from: fromDate, to: endDate};
    }
  }

  /**
   * This method calculates and returns in a from to to format
   * the period the user needs to wait before being allowed to unstake
   * from the boardroom
   * @returns Promise<AllocationTime>
   */
  async getUserUnstakeTime(): Promise<AllocationTime> {
    const {Boardroom, Treasury} = this.contracts;
    const nextEpochTimestamp = await Boardroom.nextEpochPoint();
    const currentEpoch = await Boardroom.epoch();
    const mason = await Boardroom.members(this.myAccount);
    const startTimeEpoch = mason.epochTimerStart;
    const period = await Treasury.PERIOD();
    const PeriodInHours = period / 60 / 60;
    const withdrawLockupEpochs = await Boardroom.withdrawLockupEpochs();
    const fromDate = new Date(Date.now());
    const targetEpochForClaimUnlock = Number(startTimeEpoch) + Number(withdrawLockupEpochs);
    const stakedAmount = await this.getStakedSharesOnBoardroom();
    if (currentEpoch <= targetEpochForClaimUnlock && Number(stakedAmount) === 0) {
      return {from: fromDate, to: fromDate};
    } else if (targetEpochForClaimUnlock - currentEpoch === 1) {
      const toDate = new Date(nextEpochTimestamp * 1000);
      return {from: fromDate, to: toDate};
    } else {
      const toDate = new Date(nextEpochTimestamp * 1000);
      const delta = targetEpochForClaimUnlock - Number(currentEpoch) - 1;
      const endDate = moment(toDate)
        .add(delta * PeriodInHours, 'hours')
        .toDate();
      return {from: fromDate, to: endDate};
    }
  }

  async watchAssetInMetamask(assetName: string): Promise<boolean> {
    const {ethereum} = window as any;
    if (ethereum && ethereum.networkVersion === config.chainId.toString()) {
      let asset;
      let assetUrl;
      if (assetName === 'EMP') {
        asset = this.EMP;
        assetUrl = 'https://raw.githubusercontent.com/empmoney/emp-assets/master/emp-512.png';
      } else if (assetName === 'ESHARE') {
        asset = this.ESHARE;
        assetUrl = 'https://raw.githubusercontent.com/empmoney/emp-assets/master/bshare-512.png';
      } else if (assetName === 'EBOND') {
        asset = this.EBOND;
        assetUrl = 'https://raw.githubusercontent.com/empmoney/emp-assets/master/bbond-512.png';
      }
      await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: asset.address,
            symbol: asset.symbol,
            decimals: 18,
            image: assetUrl,
          },
        },
      });
    }
    return true;
  }

  async provideEmpFtmLP(ftmAmount: string, empAmount: BigNumber): Promise<TransactionResponse> {
    const {TaxOffice} = this.contracts;
    let overrides = {
      value: parseUnits(ftmAmount, 18),
    };
    return await TaxOffice.addLiquidityETHTaxFree(
      empAmount,
      empAmount.mul(992).div(1000),
      parseUnits(ftmAmount, 18).mul(992).div(1000),
      overrides,
    );
  }

  async quoteFromSpooky(tokenAmount: string, tokenName: string): Promise<string> {
    const {SpookyRouter} = this.contracts;
    const {_reserve0, _reserve1} = await this.EMPETH_LP.getReserves();
    let quote;
    if (tokenName === 'EMP') {
      quote = await SpookyRouter.quote(parseUnits(tokenAmount), _reserve1, _reserve0);
    } else {
      quote = await SpookyRouter.quote(parseUnits(tokenAmount), _reserve0, _reserve1);
    }
    return (quote / 1e14).toString();
  }

  /**
   * @returns an array of the regulation events till the most up to date epoch
   */
  async listenForRegulationsEvents(): Promise<any> {
    const {Treasury} = this.contracts;

    const treasuryDaoFundedFilter = Treasury.filters.DaoFundFunded();
    const treasuryDevFundedFilter = Treasury.filters.DevFundFunded();
    const treasuryBoardroomFundedFilter = Treasury.filters.BoardroomFunded();
    const boughtBondsFilter = Treasury.filters.BoughtBonds();
    const redeemBondsFilter = Treasury.filters.RedeemedBonds();

    let epochBlocksRanges: any[] = [];
    let boardroomFundEvents = await Treasury.queryFilter(treasuryBoardroomFundedFilter);
    var events: any[] = [];
    boardroomFundEvents.forEach(function callback(value, index) {
      events.push({epoch: index + 1});
      events[index].boardroomFund = getDisplayBalance(value.args[1]);
      if (index === 0) {
        epochBlocksRanges.push({
          index: index,
          startBlock: value.blockNumber,
          boughBonds: 0,
          redeemedBonds: 0,
        });
      }
      if (index > 0) {
        epochBlocksRanges.push({
          index: index,
          startBlock: value.blockNumber,
          boughBonds: 0,
          redeemedBonds: 0,
        });
        epochBlocksRanges[index - 1].endBlock = value.blockNumber;
      }
    });

    epochBlocksRanges.forEach(async (value, index) => {
      events[index].bondsBought = await this.getBondsWithFilterForPeriod(
        boughtBondsFilter,
        value.startBlock,
        value.endBlock,
      );
      events[index].bondsRedeemed = await this.getBondsWithFilterForPeriod(
        redeemBondsFilter,
        value.startBlock,
        value.endBlock,
      );
    });
    let DEVFundEvents = await Treasury.queryFilter(treasuryDevFundedFilter);
    DEVFundEvents.forEach(function callback(value, index) {
      events[index].devFund = getDisplayBalance(value.args[1]);
    });
    let DAOFundEvents = await Treasury.queryFilter(treasuryDaoFundedFilter);
    DAOFundEvents.forEach(function callback(value, index) {
      events[index].daoFund = getDisplayBalance(value.args[1]);
    });
    return events;
  }

  /**
   * Helper method
   * @param filter applied on the query to the treasury events
   * @param from block number
   * @param to block number
   * @returns the amount of bonds events emitted based on the filter provided during a specific period
   */
  async getBondsWithFilterForPeriod(filter: EventFilter, from: number, to: number): Promise<number> {
    const {Treasury} = this.contracts;
    const bondsAmount = await Treasury.queryFilter(filter, from, to);
    return bondsAmount.length;
  }

  async estimateZapIn(tokenName: string, lpName: string, amount: string): Promise<number[]> {
    const {zapper} = this.contracts;
    const lpToken = this.externalTokens[lpName];
    let estimate;
    if (tokenName === BNB_TICKER) {
      estimate = await zapper.estimateZapIn(lpToken.address, SPOOKY_ROUTER_ADDR, parseUnits(amount, 18));
    } else {
      const token = tokenName === EMP_TICKER ? this.EMP : this.ESHARE;
      estimate = await zapper.estimateZapInToken(
        token.address,
        lpToken.address,
        SPOOKY_ROUTER_ADDR,
        parseUnits(amount, 18),
      );
    }
    return [estimate[0] / 1e18, estimate[1] / 1e18];
  }
  async zapIn(tokenName: string, lpName: string, amount: string): Promise<TransactionResponse> {
    const {zapper} = this.contracts;
    const lpToken = this.externalTokens[lpName];
    if (tokenName === BNB_TICKER) {
      let overrides = {
        value: parseUnits(amount, 18),
      };
      return await zapper.zapIn(lpToken.address, SPOOKY_ROUTER_ADDR, this.myAccount, overrides);
    } else {
      const token = tokenName === EMP_TICKER ? this.EMP : this.ESHARE;
      return await zapper.zapInToken(
        token.address,
        parseUnits(amount, 18),
        lpToken.address,
        SPOOKY_ROUTER_ADDR,
        this.myAccount,
      );
    }
  }
  async swapEBondToEShare(bbondAmount: BigNumber): Promise<TransactionResponse> {
    const {EShareSwapper} = this.contracts;
    return await EShareSwapper.swapEBondToEShare(bbondAmount);
  }
  async estimateAmountOfEShare(bbondAmount: string): Promise<string> {
    const {EShareSwapper} = this.contracts;
    try {
      const estimateBN = await EShareSwapper.estimateAmountOfEShare(parseUnits(bbondAmount, 18));
      return getDisplayBalance(estimateBN, 18, 6);
    } catch (err) {
      console.error(`Failed to fetch estimate bshare amount: ${err}`);
    }
  }

  async getEShareSwapperStat(address: string): Promise<EShareSwapperStat> {
    const {EShareSwapper} = this.contracts;
    const bshareBalanceBN = await EShareSwapper.getEShareBalance();
    const bbondBalanceBN = await EShareSwapper.getEBondBalance(address);
    // const empPriceBN = await EShareSwapper.getEmpPrice();
    // const bsharePriceBN = await EShareSwapper.getESharePrice();
    const rateESharePerEmpBN = await EShareSwapper.getEShareAmountPerEmp();
    const bshareBalance = getDisplayBalance(bshareBalanceBN, 18, 5);
    const bbondBalance = getDisplayBalance(bbondBalanceBN, 18, 5);
    return {
      bshareBalance: bshareBalance.toString(),
      bbondBalance: bbondBalance.toString(),
      // empPrice: empPriceBN.toString(),
      // bsharePrice: bsharePriceBN.toString(),
      rateESharePerEmp: rateESharePerEmpBN.toString(),
    };
  }
}

import { BigNumber } from 'ethers';
import { ESHARE_TICKER } from './../utils/constants';
import { useCallback } from 'react';
import useEmpFinance from './useEmpFinance';

const useStrategy = (percentEmpLP: number = 80) => {
  const empFinance = useEmpFinance();

  const handleStrategy = useCallback(async () => {
    if (!empFinance.myAccount) return;
    const harvestTxs = [];

    if (await empFinance.canUserClaimRewardFromBoardroom(1) && (await empFinance.getEarningsOnBoardroom(1)).gt(0))
      harvestTxs.push(await empFinance.harvestCashFromBoardroom(1));
    if ((await empFinance.earnedFromBank('EShareBnbEShareRewardPool', ESHARE_TICKER, 0, empFinance.myAccount)).gt(0))
      harvestTxs.push(await empFinance.harvest('EShareBnbEShareRewardPool', 0));
    if ((await empFinance.earnedFromBank('EmpEthEShareRewardPool', ESHARE_TICKER, 1, empFinance.myAccount)).gt(0))
      harvestTxs.push(await empFinance.harvest('EmpEthEShareRewardPool', 1));

    await Promise.all(harvestTxs.map((tx) => tx.wait()));
    let shareBoardroomAmount = BigNumber.from('0');

    for (let retries = 0; retries < 3; retries++) {
      const [empBalance, shareBalance] = await Promise.all([
        empFinance.EMP.balanceOf(empFinance.myAccount),
        empFinance.ESHARE.balanceOf(empFinance.myAccount)
      ]);
      const shareCompoundAmount = shareBalance.mul(80).div(100);
      shareBoardroomAmount = shareBalance.sub(shareCompoundAmount);

      const zapTxs = [];

      if (empBalance.gt(BigNumber.from('2000000000000000000')))
        zapTxs.push(await empFinance.zapStrategy(empFinance.EMP.address, empBalance, percentEmpLP, retries > 0 ? BigNumber.from('1500000').mul(retries) : null));
      if (shareCompoundAmount.gt(BigNumber.from('500000000000000')))
        zapTxs.push(await empFinance.zapStrategy(empFinance.ESHARE.address, shareCompoundAmount, percentEmpLP, retries > 0 ? BigNumber.from('1500000').mul(retries) : null));

      try {
        await Promise.all(zapTxs.map((tx) => tx.wait()));
        break;
      } catch (e) { console.error(e); }
    }

    const [balanceEMPLP, balanceSHARELP] = await Promise.all([
      empFinance.externalTokens['EMP-ETH-LP'].balanceOf(empFinance.myAccount),
      empFinance.externalTokens['ESHARE-BNB-LP'].balanceOf(empFinance.myAccount)
    ]);

    const stakeTxs = [];

    if (balanceEMPLP.gt(0))
      stakeTxs.push(await empFinance.stake('EmpEthEShareRewardPool', 1, balanceEMPLP));
    if (balanceSHARELP.gt(0))
      stakeTxs.push(await empFinance.stake('EShareBnbEShareRewardPool', 0, balanceSHARELP));
    if (shareBoardroomAmount.gt(0))
      stakeTxs.push(await empFinance.currentBoardroom(1).stake(shareBoardroomAmount));

    await Promise.all(stakeTxs.map((tx) => tx.wait()));

  }, [empFinance, percentEmpLP]);
  return { onStrategy: handleStrategy };
};

export default useStrategy;

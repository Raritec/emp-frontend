import { BigNumber } from 'ethers';
import { ESHARE_TICKER } from './../utils/constants';
import { useCallback } from 'react';
import useEmpFinance from './useEmpFinance';

const useStrategy = (percentEmpLP: number = 80) => {
  const empFinance = useEmpFinance();

  const handleStrategy = useCallback(async () => {
    if (!empFinance.myAccount) return;
    const canClaim = await empFinance.canUserClaimRewardFromBoardroom(1);

    if (canClaim && (await empFinance.getEarningsOnBoardroom(1)).gt(0)) {

      const tx = await empFinance.harvestCashFromBoardroom(1);
      await tx.wait();
    }

    const  harvestTxs = [];
    if ((await empFinance.earnedFromBank('EShareBnbEShareRewardPool', ESHARE_TICKER, 0, empFinance.myAccount)).gt(0)) {

      harvestTxs.push(await empFinance.harvest('EShareBnbEShareRewardPool', 0));
    }
    if ((await empFinance.earnedFromBank('EmpEthEShareRewardPool', ESHARE_TICKER, 1, empFinance.myAccount)).gt(0)) {

      harvestTxs.push(await empFinance.harvest('EmpEthEShareRewardPool', 1));
    }

    await Promise.all(harvestTxs.map((tx) => tx.wait()));
    const empBalance = await empFinance.EMP.balanceOf(empFinance.myAccount);

    if (empBalance.gt(BigNumber.from('2000000000000000000'))) {
      const zapTx = await empFinance.zapStrategy(empBalance, percentEmpLP);
      await zapTx.wait();
    }

    const [balanceEMPLP, balanceSHARELP] = await Promise.all([
      empFinance.externalTokens['EMP-ETH-LP'].balanceOf(empFinance.myAccount),
      empFinance.externalTokens['ESHARE-BNB-LP'].balanceOf(empFinance.myAccount)
    ]);

    if (balanceEMPLP.gt(0)) {
      const tx = await empFinance.stake('EmpEthEShareRewardPool', 1, balanceEMPLP);
      await tx.wait();
    }
    if (balanceSHARELP.gt(0)) {
      const tx = await empFinance.stake('EShareBnbEShareRewardPool', 0, balanceSHARELP);
      await tx.wait();
    }

    const shareBalance = await empFinance.ESHARE.balanceOf(empFinance.myAccount);

    if (shareBalance.gt(0)) {
      const tx = await empFinance.currentBoardroom(1).stake(shareBalance);
      await tx.wait();
    }
  }, [empFinance, percentEmpLP]);
  return { onStrategy: handleStrategy };
};

export default useStrategy;

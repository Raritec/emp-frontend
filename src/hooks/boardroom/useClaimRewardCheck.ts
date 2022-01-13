import {useEffect, useState} from 'react';
import useRefresh from '../useRefresh';
import useEmpFinance from '../useEmpFinance';

const useClaimRewardCheck = () => {
  const {slowRefresh} = useRefresh();
  const [canClaimReward, setCanClaimReward] = useState(false);
  const empFinance = useEmpFinance();
  const isUnlocked = empFinance?.isUnlocked;

  useEffect(() => {
    async function canUserClaimReward() {
      try {
        setCanClaimReward(await empFinance.canUserClaimRewardFromBoardroom());
      } catch (err) {
        console.error(err);
      }
    }
    if (isUnlocked) {
      canUserClaimReward();
    }
  }, [isUnlocked, slowRefresh, empFinance]);

  return canClaimReward;
};

export default useClaimRewardCheck;

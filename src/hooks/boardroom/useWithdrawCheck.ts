import {useEffect, useState} from 'react';
import useEmpFinance from '../useEmpFinance';
import useRefresh from '../useRefresh';

const useWithdrawCheck = () => {
  const [canWithdraw, setCanWithdraw] = useState(false);
  const empFinance = useEmpFinance();
  const {slowRefresh} = useRefresh();
  const isUnlocked = empFinance?.isUnlocked;

  useEffect(() => {
    async function canUserWithdraw() {
      try {
        setCanWithdraw(await empFinance.canUserUnstakeFromBoardroom());
      } catch (err) {
        console.error(err);
      }
    }
    if (isUnlocked) {
      canUserWithdraw();
    }
  }, [isUnlocked, empFinance, slowRefresh]);

  return canWithdraw;
};

export default useWithdrawCheck;

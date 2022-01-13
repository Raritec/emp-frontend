import {useEffect, useState} from 'react';
import useEmpFinance from '../useEmpFinance';
import {AllocationTime} from '../../emp-finance/types';

const useClaimRewardTimerBoardroom = () => {
  const [time, setTime] = useState<AllocationTime>({
    from: new Date(),
    to: new Date(),
  });
  const empFinance = useEmpFinance();

  useEffect(() => {
    if (empFinance) {
      empFinance.getUserClaimRewardTime().then(setTime);
    }
  }, [empFinance]);
  return time;
};

export default useClaimRewardTimerBoardroom;

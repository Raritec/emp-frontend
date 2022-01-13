import {useEffect, useState} from 'react';
import useEmpFinance from '../useEmpFinance';
import {AllocationTime} from '../../emp-finance/types';

const useUnstakeTimerBoardroom = () => {
  const [time, setTime] = useState<AllocationTime>({
    from: new Date(),
    to: new Date(),
  });
  const empFinance = useEmpFinance();

  useEffect(() => {
    if (empFinance) {
      empFinance.getUserUnstakeTime().then(setTime);
    }
  }, [empFinance]);
  return time;
};

export default useUnstakeTimerBoardroom;

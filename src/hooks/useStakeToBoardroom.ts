import {useCallback} from 'react';
import useEmpFinance from './useEmpFinance';
import useHandleTransactionReceipt from './useHandleTransactionReceipt';

const useStakeToBoardroom = () => {
  const empFinance = useEmpFinance();
  const handleTransactionReceipt = useHandleTransactionReceipt();

  const handleStake = useCallback(
    (amount: string) => {
      handleTransactionReceipt(empFinance.stakeShareToBoardroom(amount), `Stake ${amount} ESHARE to the boardroom`);
    },
    [empFinance, handleTransactionReceipt],
  );
  return {onStake: handleStake};
};

export default useStakeToBoardroom;

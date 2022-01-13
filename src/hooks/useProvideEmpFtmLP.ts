import {useCallback} from 'react';
import useEmpFinance from './useEmpFinance';
import useHandleTransactionReceipt from './useHandleTransactionReceipt';
import {parseUnits} from 'ethers/lib/utils';
import {TAX_OFFICE_ADDR} from '../utils/constants';

const useProvideEmpFtmLP = () => {
  const empFinance = useEmpFinance();
  const handleTransactionReceipt = useHandleTransactionReceipt();

  const handleProvideEmpFtmLP = useCallback(
    (ftmAmount: string, empAmount: string) => {
      const empAmountBn = parseUnits(empAmount);
      handleTransactionReceipt(
        empFinance.provideEmpFtmLP(ftmAmount, empAmountBn),
        `Provide EMP-ETH LP ${empAmount} ${ftmAmount} using ${TAX_OFFICE_ADDR}`,
      );
    },
    [empFinance, handleTransactionReceipt],
  );
  return {onProvideEmpFtmLP: handleProvideEmpFtmLP};
};

export default useProvideEmpFtmLP;

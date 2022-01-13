import {useCallback, useEffect, useState} from 'react';
import {BigNumber} from 'ethers';
import ERC20 from '../emp-finance/ERC20';
import useEmpFinance from './useEmpFinance';
import config from '../config';

const useBondsPurchasable = () => {
  const [balance, setBalance] = useState(BigNumber.from(0));
  const empFinance = useEmpFinance();

  useEffect(() => {
    async function fetchBondsPurchasable() {
      try {
        setBalance(await empFinance.getBondsPurchasable());
      } catch (err) {
        console.error(err);
      }
    }
    fetchBondsPurchasable();
  }, [setBalance, empFinance]);

  return balance;
};

export default useBondsPurchasable;

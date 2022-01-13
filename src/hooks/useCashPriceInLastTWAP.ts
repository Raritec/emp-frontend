import {useCallback, useEffect, useState} from 'react';
import useEmpFinance from './useEmpFinance';
import config from '../config';
import {BigNumber} from 'ethers';

const useCashPriceInLastTWAP = () => {
  const [price, setPrice] = useState<BigNumber>(BigNumber.from(0));
  const empFinance = useEmpFinance();

  const fetchCashPrice = useCallback(async () => {
    setPrice(await empFinance.getEmpPriceInLastTWAP());
  }, [empFinance]);

  useEffect(() => {
    fetchCashPrice().catch((err) => console.error(`Failed to fetch EMP price: ${err.stack}`));
    const refreshInterval = setInterval(fetchCashPrice, config.refreshInterval);
    return () => clearInterval(refreshInterval);
  }, [setPrice, empFinance, fetchCashPrice]);

  return price;
};

export default useCashPriceInLastTWAP;

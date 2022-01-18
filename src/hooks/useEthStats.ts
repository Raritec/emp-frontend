import {useEffect, useState} from 'react';
import useEmpFinance from './useEmpFinance';
import useRefresh from './useRefresh';

const useEthStats = () => {
  const [stat, setStat] = useState<Number>();
  const {slowRefresh} = useRefresh();
  const empFinance = useEmpFinance();

  useEffect(() => {
    async function fetchSharePrice() {
      try {
        setStat(await empFinance.getETHPriceUSD());
      } catch (err) {
        console.error(err);
      }
    }
    fetchSharePrice();
  }, [setStat, empFinance, slowRefresh]);

  return stat;
};

export default useEthStats;

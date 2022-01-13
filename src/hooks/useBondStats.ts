import {useEffect, useState} from 'react';
import useEmpFinance from './useEmpFinance';
import {TokenStat} from '../emp-finance/types';
import useRefresh from './useRefresh';

const useBondStats = () => {
  const [stat, setStat] = useState<TokenStat>();
  const {slowRefresh} = useRefresh();
  const empFinance = useEmpFinance();

  useEffect(() => {
    async function fetchBondPrice() {
      try {
        setStat(await empFinance.getBondStat());
      } catch (err) {
        console.error(err);
      }
    }
    fetchBondPrice();
  }, [setStat, empFinance, slowRefresh]);

  return stat;
};

export default useBondStats;

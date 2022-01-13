import React, {useMemo, useState} from 'react';
import Page from '../../components/Page';
import {createGlobalStyle} from 'styled-components';
import HomeImage from '../../assets/img/background.jpg';
import useLpStats from '../../hooks/useLpStats';
import {Box, Button, Grid, Paper, Typography} from '@material-ui/core';
import useEmpStats from '../../hooks/useEmpStats';
import TokenInput from '../../components/TokenInput';
import useEmpFinance from '../../hooks/useEmpFinance';
import {useWallet} from 'use-wallet';
import useTokenBalance from '../../hooks/useTokenBalance';
import {getDisplayBalance} from '../../utils/formatBalance';
import useApproveTaxOffice from '../../hooks/useApproveTaxOffice';
import {ApprovalState} from '../../hooks/useApprove';
import useProvideEmpFtmLP from '../../hooks/useProvideEmpFtmLP';
import {Alert} from '@material-ui/lab';

const BackgroundImage = createGlobalStyle`
  body {
    background: url(${HomeImage}) no-repeat !important;
    background-size: cover !important;
    background-color: #171923;
  }
`;
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

const ProvideLiquidity = () => {
  const [empAmount, setEmpAmount] = useState(0);
  const [ftmAmount, setFtmAmount] = useState(0);
  const [lpTokensAmount, setLpTokensAmount] = useState(0);
  const {balance} = useWallet();
  const empStats = useEmpStats();
  const empFinance = useEmpFinance();
  const [approveTaxOfficeStatus, approveTaxOffice] = useApproveTaxOffice();
  const empBalance = useTokenBalance(empFinance.EMP);
  const btcBalance = useTokenBalance(empFinance.ETH);

  const ftmBalance = (btcBalance / 1e18).toFixed(4);
  const {onProvideEmpFtmLP} = useProvideEmpFtmLP();
  const empFtmLpStats = useLpStats('EMP-ETH-LP');

  const empLPStats = useMemo(() => (empFtmLpStats ? empFtmLpStats : null), [empFtmLpStats]);
  const empPriceInBNB = useMemo(() => (empStats ? Number(empStats.tokenInFtm).toFixed(2) : null), [empStats]);
  const ftmPriceInEMP = useMemo(() => (empStats ? Number(1 / empStats.tokenInFtm).toFixed(2) : null), [empStats]);
  // const classes = useStyles();

  const handleEmpChange = async (e) => {
    if (e.currentTarget.value === '' || e.currentTarget.value === 0) {
      setEmpAmount(e.currentTarget.value);
    }
    if (!isNumeric(e.currentTarget.value)) return;
    setEmpAmount(e.currentTarget.value);
    const quoteFromSpooky = await empFinance.quoteFromSpooky(e.currentTarget.value, 'EMP');
    setFtmAmount(quoteFromSpooky);
    setLpTokensAmount(quoteFromSpooky / empLPStats.ftmAmount);
  };

  const handleFtmChange = async (e) => {
    if (e.currentTarget.value === '' || e.currentTarget.value === 0) {
      setFtmAmount(e.currentTarget.value);
    }
    if (!isNumeric(e.currentTarget.value)) return;
    setFtmAmount(e.currentTarget.value);
    const quoteFromSpooky = await empFinance.quoteFromSpooky(e.currentTarget.value, 'ETH');
    setEmpAmount(quoteFromSpooky);

    setLpTokensAmount(quoteFromSpooky / empLPStats.tokenAmount);
  };
  const handleEmpSelectMax = async () => {
    const quoteFromSpooky = await empFinance.quoteFromSpooky(getDisplayBalance(empBalance), 'EMP');
    setEmpAmount(getDisplayBalance(empBalance));
    setFtmAmount(quoteFromSpooky);
    setLpTokensAmount(quoteFromSpooky / empLPStats.ftmAmount);
  };
  const handleFtmSelectMax = async () => {
    const quoteFromSpooky = await empFinance.quoteFromSpooky(ftmBalance, 'BNB');
    setFtmAmount(ftmBalance);
    setEmpAmount(quoteFromSpooky);
    setLpTokensAmount(ftmBalance / empLPStats.ftmAmount);
  };
  return (
    <Page>
      <BackgroundImage />
      <Typography color="textPrimary" align="center" variant="h3" gutterBottom>
        Provide Liquidity
      </Typography>

      <Grid container justify="center">
        <Box style={{width: '600px'}}>
          <Alert variant="filled" severity="warning" style={{marginBottom: '10px'}}>
            <b>
              This and{' '}
              <a href="https://pancakeswap.finance/" rel="noopener noreferrer" target="_blank">
                Pancakeswap
              </a>{' '}
              are the only ways to provide Liquidity on EMP-ETH pair without paying tax.
            </b>
          </Alert>
          <Grid item xs={12} sm={12}>
            <Paper>
              <Box mt={4}>
                <Grid item xs={12} sm={12} style={{borderRadius: 15}}>
                  <Box p={4}>
                    <Grid container>
                      <Grid item xs={12}>
                        <TokenInput
                          onSelectMax={handleEmpSelectMax}
                          onChange={handleEmpChange}
                          value={empAmount}
                          max={getDisplayBalance(empBalance)}
                          symbol={'EMP'}
                        ></TokenInput>
                      </Grid>
                      <Grid item xs={12}>
                        <TokenInput
                          onSelectMax={handleFtmSelectMax}
                          onChange={handleFtmChange}
                          value={ftmAmount}
                          max={ftmBalance}
                          symbol={'ETH'}
                        ></TokenInput>
                      </Grid>
                      <Grid item xs={12}>
                        <p>1 EMP = {empPriceInBNB} BNB</p>
                        <p>1 BNB = {ftmPriceInEMP} EMP</p>
                        <p>LP tokens ≈ {lpTokensAmount.toFixed(2)}</p>
                      </Grid>
                      <Grid xs={12} justifyContent="center" style={{textAlign: 'center'}}>
                        {approveTaxOfficeStatus === ApprovalState.APPROVED ? (
                          <Button
                            variant="contained"
                            onClick={() => onProvideEmpFtmLP(ftmAmount.toString(), empAmount.toString())}
                            color="primary"
                            style={{margin: '0 10px', color: '#fff'}}
                          >
                            Supply
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => approveTaxOffice()}
                            color="secondary"
                            style={{margin: '0 10px'}}
                          >
                            Approve
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Box>
      </Grid>
    </Page>
  );
};

export default ProvideLiquidity;

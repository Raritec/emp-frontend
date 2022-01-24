import React, { useMemo, useEffect } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@material-ui/core';

import ListItemLink from '../ListItemLink';
import useEmpStats from '../../hooks/useEmpStats';
import useEthStats from '../../hooks/useEthStats';
import useShareStats from '../../hooks/useeShareStats';

import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import AccountButton from './AccountButton';

import empLogo from '../../assets/img/emp-logo-final.gif';
import { roundAndFormatNumber } from '../../0x';
import TokenSymbol from '../TokenSymbol';

const useStyles = makeStyles((theme) => ({
  '@global': {
    ul: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
    },
  },
  appBar: {
    color: '#155aca',
    'background-color': '#10131e',
    // borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '10px',
    marginBottom: '3rem',
  },
  drawer: {
    width: 240,
    flexShrink: 0,
  },
  drawerPaper: {
    width: 240,
  },
  hide: {
    display: 'none',
  },
  toolbar: {
    flexWrap: 'wrap',
  },
  toolbarTitle: {
    fontFamily: 'Rubik',
    fontSize: '0px',
    flexGrow: 1,
  },
  link: {
    textTransform: 'uppercase',
    color: '#155aca',
    fontSize: '18px',
    marginTop: '15px',
    margin: theme.spacing(10, 1, 1, 2),
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'none',
    },
  },
  brandLink: {
    textDecoration: 'none',
    color: '#155aca',
    '&:hover': {
      textDecoration: 'none',
    },
  },
}));

const Nav = () => {
  const matches = useMediaQuery('(min-width:900px)');
  const classes = useStyles();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const empStats = useEmpStats();
  const btcStats = useEthStats();
  const shareStats = useShareStats();

  const [connected, setConnected] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const btcPriceInDollars = useMemo(() => (btcStats ? Number(btcStats).toFixed(2) : null), [btcStats]);
  const empPriceInDollars = useMemo(
    () => (empStats ? Number(empStats.priceInDollars).toFixed(2) : null),
    [empStats],
  );
  const sharePriceInDollars = useMemo(
    () => (shareStats ? Number(shareStats.priceInDollars).toFixed(2) : null),
    [shareStats],
  );

  return (
    <AppBar position="sticky" elevation={0} className={classes.appBar}>
      <Toolbar className={classes.toolbar}>
        {matches ? (
          <>
            <Typography variant="h6" color="inherit" noWrap style={{ flexGrow: '0', marginBottom: '-5px' }} className={classes.toolbarTitle}>
              {/* <a className={ classes.brandLink } href="/">Emp Money</a> */}
              <Link to="/" color="inherit" className={classes.brandLink}>
                <img alt="emp.money" src={empLogo} height="80px" />
              </Link>
            </Typography>
            <Box style={{ paddingLeft: '15px', paddingTop: '10px', fontSize: '1rem', flexGrow: '1' }}>
              <Link to="/" className={'navLink ' + classes.link}>
                Home
              </Link>
              <Link to="/farm" className={'navLink ' + classes.link}>
                Farm
              </Link>
              <Link to="/boardroomV2" className={'navLink ' + classes.link}>
                BoardroomV2
              </Link>
              <Link to="/bond" className={'navLink ' + classes.link}>
                Bond
              </Link>

              {/* <Link color="textPrimary" to="/sbs" className={classes.link}>
                SBS
              </Link> */}
              <Link to="/liquidity" className={'navLink ' + classes.link}>
                Liquidity
              </Link>
              {/* <Link color="textPrimary" to="/regulations" className={classes.link}>
                Regulations
              </Link> */}
              <a href="https://yieldwolf.finance/bsc/emp-money" className={'navLink ' + classes.link} rel="noopener" target="_blank">
                AutoVaults
              </a>
              <a href="https://docs.emp.money/documents" className={'navLink ' + classes.link} rel="noopener" target="_blank">
                Docs
              </a>
            </Box>

            <Box
              style={{
                flexGrow: '0',
                paddingLeft: '15px',
                paddingTop: '5px',
                fontSize: '1rem',
                paddingRight: '15px',
                height: '30px',
                display: 'flex',
              }}
            >
              <div className="navTokenIcon emp"></div>{' '}
              <div className="navTokenPrice">${roundAndFormatNumber(Number(empPriceInDollars), 2)}</div>
              <div className="navTokenIcon bshare"></div>{' '}
              <div className="navTokenPrice">${roundAndFormatNumber(Number(sharePriceInDollars), 2)}</div>
              <div className="navTokenIcon btc"></div>{' '}
              <div className="navTokenPrice">${roundAndFormatNumber(Number(btcPriceInDollars), 2)}</div>
            </Box>
            <AccountButton text="Connect" />
          </>
        ) : (
          <>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              className={clsx(open && classes.hide)}
            >
              <MenuIcon />
            </IconButton>

            <img
              alt="emp.money"
              src={empLogo}
              style={{ height: '60px', marginTop: '5px', marginLeft: '10px', marginRight: '15px' }}
            />
            <AccountButton text="Connect" />
            <Drawer
              className={classes.drawer}
              onEscapeKeyDown={handleDrawerClose}
              onBackdropClick={handleDrawerClose}
              variant="temporary"
              anchor="left"
              open={open}
              classes={{
                paper: classes.drawerPaper,
              }}
            >
              <div>
                <IconButton onClick={handleDrawerClose}>
                  {theme.direction === 'rtl' ? (
                    <ChevronRightIcon htmlColor="white" />
                  ) : (
                    <ChevronLeftIcon htmlColor="white" />
                  )}
                </IconButton>
              </div>
              <Divider />
              <List>
                <ListItem>
                  <AccountButton text="Connect" />
                </ListItem>
                <ListItemLink primary="Home" to="/" />
                <ListItemLink primary="Farm" to="/farm" />
                <ListItemLink primary="BoardroomV2" to="/boardroomV2" />
                <ListItemLink primary="Bond" to="/bond" />
                {/* <ListItemLink primary="SBS" to="/sbs" /> */}
                <ListItemLink primary="Liquidity" to="/liquidity" />
                {/* <ListItemLink primary="Regulations" to="/regulations" /> */}
                <ListItem button component="a" href="https://yieldwolf.finance/bsc/emp-money">
                  <ListItemText>AutoVaults</ListItemText>
                </ListItem>
                <ListItem button component="a" href="https://docs.emp.money/documents">
                  <ListItemText>Docs</ListItemText>
                </ListItem>
              </List>
            </Drawer>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Nav;

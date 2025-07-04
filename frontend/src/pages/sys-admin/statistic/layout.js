import React from 'react';
import { useLocation } from '@gatsbyjs/reach-router';
import StatisticNav from './statistic-nav';
import MainPanelTopbar from '../main-panel-topbar';

const StatisticLayout = ({ children, ...commonProps }) => {
  const location = useLocation();
  const pathSegment = location.pathname.split('/').filter(Boolean).pop();
  const currentItem = `${pathSegment}Statistic`;
  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <StatisticNav currentItem={currentItem} />
      {children}
    </>
  );
};

export default StatisticLayout;

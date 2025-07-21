import React from 'react';
import { Router, useLocation } from '@gatsbyjs/reach-router';
import StatisticNav from './statistic-nav';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticFile from './statistic-file';
import StatisticStorage from './statistic-storage';
import StatisticUsers from './statistic-users';
import StatisticTraffic from './statistic-traffic';
import StatisticMetrics from './statistic-metrics';
import StatisticReports from './statistic-reports';

const StatisticLayout = ({ children, ...commonProps }) => {
  const location = useLocation();
  const pathSegment = location.pathname.split('/').filter(Boolean).pop();
  const currentItem = `${pathSegment}Statistic`;
  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <StatisticNav currentItem={currentItem} />
      <Router className="d-flex overflow-hidden">
        <StatisticFile path="file" />
        <StatisticStorage path="storage" />
        <StatisticUsers path="user" />
        <StatisticTraffic path="traffic" />
        <StatisticReports path="reports" />
        <StatisticMetrics path="metrics" />
      </Router>
    </>
  );
};

export default StatisticLayout;

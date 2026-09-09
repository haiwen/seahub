import React from 'react';
import { Router, useLocation } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticAI from './statistic-ai';
import StatisticFile from './statistic-file';
import StatisticMetrics from './statistic-metrics';
import StatisticNav from './statistic-nav';
import StatisticReports from './statistic-reports';
import StatisticStorage from './statistic-storage';
import StatisticTraffic from './statistic-traffic';
import StatisticUsers from './statistic-users';

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
        <StatisticAI path="ai" />
        <StatisticReports path="reports" />
        <StatisticMetrics path="metrics" />
      </Router>
    </>
  );
};

export default StatisticLayout;

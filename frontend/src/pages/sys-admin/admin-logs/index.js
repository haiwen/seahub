import React from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import LogsNav from './logs-nav';
import { useLocation } from '@gatsbyjs/reach-router';

const AdminLogs = ({ children, ...commonProps }) => {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  return (
    <>
      <MainPanelTopbar {...commonProps} />
      <LogsNav currentItem={path} />
      <div className="h-100 d-flex overflow-auto">{children}</div>
    </>
  );
};

export default AdminLogs;

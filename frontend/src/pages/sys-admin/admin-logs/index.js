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
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <LogsNav currentItem={path} />
          <div className="cur-view-content">{children}</div>
        </div>
      </div>
    </>
  );
};

export default AdminLogs;

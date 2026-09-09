import React from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import Nav from './nav';
import { useLocation } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { eventBus, EVENT_BUS_TYPE } from '../../../components/event-bus';

const VirusScan = ({ children, ...commonProps }) => {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();


  const deleteSelectedItems = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, {
      operation: 'delete-virus',
      scope: 'selected'
    });
  };

  const ignoreSelectedItems = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, {
      operation: 'ignore-virus',
      scope: 'selected'
    });
  };

  const deleteAllUnhandledItems = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, {
      operation: 'delete-virus',
      scope: 'all'
    });
  };

  const ignoreAllUnhandledItems = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, {
      operation: 'ignore-virus',
      scope: 'all'
    });
  };

  return (
    <>
      {path === 'unhandled' ? (
        <MainPanelTopbar {...commonProps}>
          <>
            <Button onClick={deleteSelectedItems} className="operation-item">{gettext('Delete')}</Button>
            <Button onClick={ignoreSelectedItems} className="operation-item">{gettext('Ignore')}</Button>
            <Button onClick={deleteAllUnhandledItems} className="operation-item">{gettext('Delete all')}</Button>
            <Button onClick={ignoreAllUnhandledItems} className="operation-item">{gettext('Ignore all')}</Button>
          </>
        </MainPanelTopbar>
      ) : (
        <MainPanelTopbar {...commonProps} />
      )}
      <div className="main-panel-center">
        <div className="cur-view-container">
          <Nav currentItem={path} />
          <div className="cur-view-content">{children}</div>
        </div>
      </div>
    </>
  );
};

export default VirusScan;

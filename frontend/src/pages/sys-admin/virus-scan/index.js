import React from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import Nav from './nav';
import { useLocation } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { eventBus } from '../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';

const VirusScan = ({ children, ...commonProps }) => {
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();


  const deleteSelectedItems = () => {
    const op = 'delete-virus';
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, op);
  };

  const ignoreSelectedItems = () => {
    const op = 'ignore-virus';
    eventBus.dispatch(EVENT_BUS_TYPE.HANDLE_SELECTED_OPERATIONS, op);
  };
  return (
    <div>
      {path === 'unhandled' ? (
        <MainPanelTopbar {...commonProps}>
          <>
            <Button onClick={deleteSelectedItems} className="operation-item">{gettext('Delete')}</Button>
            <Button onClick={ignoreSelectedItems} className="operation-item">{gettext('Ignore')}</Button>
          </>
        </MainPanelTopbar>
      ) : (
        <MainPanelTopbar {...commonProps} />
      )}
      <Nav currentItem={path} />
      <div className="h-100 d-flex overflow-auto">{children}</div>
    </div>
  );
};

export default VirusScan;

import React, { useCallback, useEffect, useState } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import DevicesNav from './devices-nav';
import { useLocation } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';
import { eventBus } from '../../../components/common/event-bus';

const Devices = ({ children, ...commonProps }) => {
  const [isCleanBtnShown, setIsCleanBtnShown] = useState(false);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();

  const onClean = useCallback(() => {
    systemAdminAPI.sysAdminClearDeviceErrors().then((res) => {
      eventBus.dispatch(EVENT_BUS_TYPE.CLEAR_DEVICE_ERRORS);
      setIsCleanBtnShown(false);
      let message = gettext('Successfully cleaned all errors.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, []);

  useEffect(() => {
    const unsubscribeShowCleanBtn = eventBus.subscribe(EVENT_BUS_TYPE.SHOW_CLEAN_BTN, () => {
      setIsCleanBtnShown(true);
    });

    return () => {
      unsubscribeShowCleanBtn();
    };
  }, []);

  return (
    <>
      {path === 'errors' && isCleanBtnShown ? (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={onClean}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      ) : (
        <MainPanelTopbar { ...commonProps } />
      )}
      <DevicesNav currentItem={path} />
      {children}
    </>
  );
};

export default Devices;

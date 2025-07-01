import React, { useCallback, useState } from 'react';
import { Button } from 'reactstrap';
import { Router, useLocation } from '@gatsbyjs/reach-router';
import MainPanelTopbar from '../main-panel-topbar';
import DevicesNav from './devices-nav';
import DesktopDevices from './desktop-devices';
import MobileDevices from './mobile-devices';
import DeviceErrors from './devices-errors';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';

const PATH_NAME_MAP = {
  'desktop-devices': 'desktop',
  'mobile-devices': 'mobile',
  'device-errors': 'errors'
};

const DevicesLayout = ({ children, ...commonProps }) => {
  const [isCleanBtnShown, setIsCleanBtnShown] = useState(false);
  const [devicesErrors, setDevicesErrors] = useState([]);
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  const pathSegment = PATH_NAME_MAP[path] || 'desktop';

  const onShowCleanBtn = useCallback(() => {
    setIsCleanBtnShown(true);
  }, []);

  const onClean = useCallback(() => {
    systemAdminAPI.sysAdminClearDeviceErrors().then((res) => {
      setDevicesErrors([]);
      setIsCleanBtnShown(false);
      let message = gettext('Successfully cleaned all errors.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, []);

  return (
    <>
      {isCleanBtnShown ? (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={onClean}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      ) : (
        <MainPanelTopbar {...commonProps} />
      )}
      <DevicesNav currentItem={pathSegment} />
      <Router>
        <DesktopDevices path="desktop-devices" />
        <MobileDevices path="mobile-devices" />
        <DeviceErrors path="device-errors" devicesErrors={devicesErrors} onShowCleanBtn={onShowCleanBtn} />
      </Router>
    </>
  );
};

export default DevicesLayout;

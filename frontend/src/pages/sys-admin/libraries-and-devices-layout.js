import React, { useCallback, useState } from 'react';
import { Router, useLocation, navigate } from '@gatsbyjs/reach-router';
import { Button } from 'reactstrap';
import MainPanelTopbar from './main-panel-topbar';
import { gettext, siteRoot } from '../../utils/constants';
import AllRepos from './repos/all-repos';
import AllWikis from './repos/all-wikis';
import SystemRepo from './repos/system-repo';
import TrashRepos from './repos/trash-repos';
import ReposNav from './repos/repos-nav';
import DevicesNav from './devices/devices-nav';
import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';
import Search from './search';
import toaster from '../../components/toast';
import { systemAdminAPI } from '../../utils/system-admin-api';
import { Utils } from '../../utils/utils';

const DEVICES_PATH_KEYS = [
  'desktop-devices',
  'mobile-devices',
  'device-errors'
];

const PATH_NAME_MAP = {
  'desktop-devices': 'desktop',
  'mobile-devices': 'mobile',
  'device-errors': 'errors',
  'all-libraries': 'all',
  'all-wikis': 'wikis',
  'system-library': 'system',
  'trash-libraries': 'trash'
};

const DevicesAndLibrariesLayout = ({ ...commonProps }) => {
  const [isCreateRepoDialogOpen, setIsCreateRepoDialogOpen] = useState(false);
  const [isCleanTrashDialogOpen, setIsCleanTrashDialogOpen] = useState(false);
  const [isCleanBtnShown, setIsCleanBtnShown] = useState(false);
  const [devicesErrors, setDevicesErrors] = useState([]);

  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  const pathSegment = PATH_NAME_MAP[path];
  const isDevices = DEVICES_PATH_KEYS.includes(path);

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

  const getValueLength = (str) => {
    let code; let len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { // solve enter problem
        len += 2;
      } else if (code < 0x007f) {
        len += 1;
      } else if (code >= 0x0080 && code <= 0x07ff) {
        len += 2;
      } else if (code >= 0x0800 && code <= 0xffff) {
        len += 3;
      }
    }
    return len;
  };

  const searchRepos = (repoNameOrID) => {
    if (getValueLength(repoNameOrID) < 3) {
      toaster.notify(gettext('Required at least three letters.'));
      return;
    }
    navigate(`${siteRoot}sys/search-libraries/?name_or_id=${encodeURIComponent(repoNameOrID)}`);
  };

  const getSearch = () => {
    return (
      <Search
        placeholder={gettext('Search libraries by name or ID')}
        submit={searchRepos}
      />
    );
  };

  const toggleCreateRepoDialog = useCallback(() => {
    setIsCreateRepoDialogOpen(!isCreateRepoDialogOpen);
  }, [isCreateRepoDialogOpen]);

  const toggleCleanTrashDialog = useCallback(() => {
    setIsCleanTrashDialogOpen(!isCleanTrashDialogOpen);
  }, [isCleanTrashDialogOpen]);

  const showDefaultTopbar = pathSegment !== 'all' && pathSegment !== 'trash' && !(pathSegment === 'errors' && devicesErrors.length > 0);
  return (
    <>
      {pathSegment === 'all' && (
        <MainPanelTopbar search={getSearch()} { ...commonProps }>
          <Button className="btn btn-secondary operation-item" onClick={toggleCreateRepoDialog}>
            <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
          </Button>
        </MainPanelTopbar>
      )}
      {pathSegment === 'errors' && isCleanBtnShown && (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={onClean}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      )}
      {pathSegment === 'trash' && (
        <MainPanelTopbar {...commonProps}>
          <Button className="operation-item" onClick={toggleCleanTrashDialog}>{gettext('Clean')}</Button>
        </MainPanelTopbar>
      )}
      {showDefaultTopbar && <MainPanelTopbar { ...commonProps } />}
      {isDevices ? (
        <DevicesNav currentItem={pathSegment} />
      ) : (
        <ReposNav currentItem={pathSegment} />
      )}
      <Router>
        <DesktopDevices path="desktop-devices" />
        <MobileDevices path="mobile-devices" />
        <DeviceErrors path="device-errors" devicesErrors={devicesErrors} onShowCleanBtn={onShowCleanBtn} />

        <AllRepos
          path="all-libraries"
          isCreateRepoDialogOpen={isCreateRepoDialogOpen}
          toggleCreateRepoDialog={toggleCreateRepoDialog}
        />
        <AllWikis path="all-wikis" />
        <SystemRepo path="system-library" />
        <TrashRepos
          path="trash-libraries"
          isCleanTrashDialogOpen={isCleanTrashDialogOpen}
          toggleCleanTrashDialog={toggleCleanTrashDialog}
        />
      </Router>
    </>
  );
};

export default DevicesAndLibrariesLayout;

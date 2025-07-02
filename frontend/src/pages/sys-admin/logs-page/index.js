import React, { useState } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import { Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import LogsNav from '../logs-page/logs-nav';
import { useLocation } from '@gatsbyjs/reach-router';
import ModalPortal from '../../../components/modal-portal';
import LogsExportExcelDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-logs-export-excel-dialog';

const LOG_PATH_NAME_MAP = {
  'login': 'loginLogs',
  'file-access': 'fileAccessLogs',
  'file-update': 'fileUpdateLogs',
  'share-permission': 'sharePermissionLogs',
  'repo-transfer': 'fileTransfer',
  'group-member-audit': 'groupMember',
};

const Logs = ({ children, ...commonProps }) => {
  const [isExportExcelDialogOpen, setIsExportExcelDialogOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname.split('/').filter(Boolean).pop();
  const curTab = LOG_PATH_NAME_MAP[path];

  const toggleDialog = () => {
    setIsExportExcelDialogOpen(!isExportExcelDialogOpen);
  };

  const showDefaultTopbar = curTab === 'fileTransfer' || curTab === 'groupMember';
  return (
    <>
      {showDefaultTopbar ? (
        <MainPanelTopbar {...commonProps} />
      ) : (
        <MainPanelTopbar {...commonProps}>
          <Button className="btn btn-secondary operation-item" onClick={toggleDialog}>{gettext('Export Excel')}</Button>
        </MainPanelTopbar>
      )}
      <LogsNav currentItem={curTab} {...commonProps} />
      {children}
      {isExportExcelDialogOpen &&
        <ModalPortal>
          <LogsExportExcelDialog
            logType={curTab}
            toggle={toggleDialog}
          />
        </ModalPortal>
      }
    </>
  );
};

export default Logs;

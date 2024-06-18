import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import TreeSection from '../../tree-section';
import MetadataManagementStatusDialog from '../../metadata-manage/metadata-manage-status-dialog';
import metadataManagerAPI from '../../metadata-manage/api';
import toaster from '../../toast';
import MetadataManage from '../../metadata-manage/metadata-manage';

const DirViews = ({ userPerm, repoID }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [loading, setLoading] = useState(true);
  const [showMetadataManagementStatusDialog, setShowMetadataManagementStatusDialog] = useState(false);
  const [metadataManagementState, setMetadataManagementState] = useState(false);
  const moreOperations = useMemo(() => {
    if (!enableMetadataManagement) return [];
    if (userPerm !== 'rw') return [];
    return [
      { key: 'extended-properties', value: gettext('Extended properties') }
    ];
  }, [enableMetadataManagement, userPerm]);

  useEffect(() => {
    const repoMetadataManagementEnabledStatusRes = metadataManagerAPI.getRepoMetadataManagementEnabledStatus(repoID);
    Promise.all([repoMetadataManagementEnabledStatusRes]).then(results => {
      const [repoMetadataManagementEnabledStatusRes] = results;
      setMetadataManagementState(repoMetadataManagementEnabledStatusRes.data.enabled);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moreOperationClick = useCallback((operationKey) => {
    if (operationKey === 'extended-properties') {
      setShowMetadataManagementStatusDialog(true);
      return;
    }
  }, []);

  const closeMetadataManagementDialog = useCallback(() => {
    setShowMetadataManagementStatusDialog(false);
  }, []);

  const toggleMetadataManagement = useCallback((value) => {
    if (metadataManagementState === value) return;
    setMetadataManagementState(value);
  }, [metadataManagementState]);

  return (
    <>
      <TreeSection title={gettext('Views')} moreKey={{ name: 'views' }} moreOperations={moreOperations} moreOperationClick={moreOperationClick}>
        {!loading && metadataManagementState && (<MetadataManage repoID={repoID} />)}
      </TreeSection>
      {showMetadataManagementStatusDialog && (
        <MetadataManagementStatusDialog value={metadataManagementState} repoID={repoID} toggle={closeMetadataManagementDialog} submit={toggleMetadataManagement} />
      )}
    </>
  );
};

DirViews.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
};

export default DirViews;

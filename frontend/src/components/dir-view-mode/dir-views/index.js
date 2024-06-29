import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import TreeSection from '../../tree-section';
import { MetadataStatusManagementDialog, MetadataTreeView } from '../../../metadata';
import metadataAPI from '../../../metadata/api';
import toaster from '../../toast';

import './index.css';

const DirViews = ({ userPerm, repoID, currentPath, onNodeClick }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [loading, setLoading] = useState(true);
  const [showMetadataStatusManagementDialog, setShowMetadataStatusManagementDialog] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState(false);
  const moreOperations = useMemo(() => {
    if (!enableMetadataManagement) return [];
    if (userPerm !== 'rw' && userPerm !== 'admin') return [];
    return [
      { key: 'extended-properties', value: gettext('Extended properties') }
    ];
  }, [enableMetadataManagement, userPerm]);

  useEffect(() => {
    if (!enableMetadataManagement) {
      setLoading(false);
      return;
    }

    const repoMetadataManagementEnabledStatusRes = metadataAPI.getMetadataStatus(repoID);
    Promise.all([repoMetadataManagementEnabledStatusRes]).then(results => {
      const [repoMetadataManagementEnabledStatusRes] = results;
      setMetadataStatus(repoMetadataManagementEnabledStatusRes.data.enabled);
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
      setShowMetadataStatusManagementDialog(true);
      return;
    }
  }, []);

  const closeMetadataManagementDialog = useCallback(() => {
    setShowMetadataStatusManagementDialog(false);
  }, []);

  const toggleMetadataStatus = useCallback((value) => {
    if (metadataStatus === value) return;
    setMetadataStatus(value);
  }, [metadataStatus]);

  return (
    <>
      <TreeSection title={gettext('Views')} moreKey={{ name: 'views' }} moreOperations={moreOperations} moreOperationClick={moreOperationClick}>
        {!loading && metadataStatus && (<MetadataTreeView repoID={repoID} currentPath={currentPath} onNodeClick={onNodeClick} />)}
      </TreeSection>
      {showMetadataStatusManagementDialog && (
        <MetadataStatusManagementDialog value={metadataStatus} repoID={repoID} toggle={closeMetadataManagementDialog} submit={toggleMetadataStatus} />
      )}
    </>
  );
};

DirViews.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentPath: PropTypes.string,
  onNodeClick: PropTypes.func,
};

export default DirViews;

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TreeSection from '../tree-section';
import { MetadataStatusManagementDialog, MetadataTreeView, useMetadataStatus } from '../../metadata';

const DirViews = ({ userPerm, repoID, currentPath, onNodeClick }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [showMetadataStatusManagementDialog, setShowMetadataStatusManagementDialog] = useState(false);
  const { enableMetadata, updateEnableMetadata } = useMetadataStatus();
  const moreOperations = useMemo(() => {
    if (!enableMetadataManagement) return [];
    if (userPerm !== 'rw' && userPerm !== 'admin') return [];
    return [
      { key: 'extended-properties', value: gettext('Extended properties') }
    ];
  }, [enableMetadataManagement, userPerm]);

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
    updateEnableMetadata(value);
  }, [updateEnableMetadata]);

  return (
    <>
      <TreeSection
        title={gettext('Views')}
        moreKey={{ name: 'views' }}
        moreOperations={moreOperations}
        moreOperationClick={moreOperationClick}
      >
        {enableMetadata && (<MetadataTreeView userPerm={userPerm} repoID={repoID} currentPath={currentPath} onNodeClick={onNodeClick} />)}
      </TreeSection>
      {showMetadataStatusManagementDialog && (
        <MetadataStatusManagementDialog
          value={enableMetadata}
          repoID={repoID}
          toggle={closeMetadataManagementDialog}
          submit={toggleMetadataStatus}
        />
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

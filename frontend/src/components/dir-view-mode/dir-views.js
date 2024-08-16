import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TreeSection from '../tree-section';
import { MetadataStatusManagementDialog, MetadataTreeView, useMetadata } from '../../metadata';

const DirViews = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [showMetadataStatusManagementDialog, setShowMetadataStatusManagementDialog] = useState(false);
  const { enableMetadata, updateEnableMetadata, navigation } = useMetadata();
  const moreOperations = useMemo(() => {
    if (!enableMetadataManagement || !currentRepoInfo.is_admin) return [];
    return [
      { key: 'extended-properties', value: gettext('Extended properties') }
    ];
  }, [enableMetadataManagement, currentRepoInfo]);

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
        {enableMetadata && Array.isArray(navigation) && navigation.length > 0 && (
          <MetadataTreeView userPerm={userPerm} currentPath={currentPath} />
        )}
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

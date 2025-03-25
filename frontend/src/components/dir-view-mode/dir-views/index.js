import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import TreeSection from '../../tree-section';
import ExtensionPrompts from '../extension-prompts';
import LibSettingsDialog from '../../dialog/lib-settings';
import ViewsMoreOperations from './views-more-operations';
import { MetadataTreeView, useMetadata } from '../../../metadata';
import { useMetadataStatus } from '../../../hooks';
import { gettext } from '../../../utils/constants';
import { TAB } from '../../../constants/repo-setting-tabs';

import './index.css';

const DirViews = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const { isLoading } = useMetadata();
  const { enableMetadata } = useMetadataStatus();

  let [isSettingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const toggleSettingsDialog = () => {
    setSettingsDialogOpen(!isSettingsDialogOpen);
  };

  const onExtendedProperties = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  if (!enableMetadataManagement || (!enableMetadata && !currentRepoInfo.is_admin)) {
    return null;
  }

  const renderTreeSectionHeaderOperations = (menuProps) => {
    const canAdd = userPerm === 'rw' || userPerm === 'admin';

    let operations = [];
    if (enableMetadata && canAdd) {
      operations.push(
        <ViewsMoreOperations
          key={'tree-section-more-operation'}
          menuProps={menuProps}
        />
      );
    }
    return operations;
  };

  return (
    <>
      <TreeSection
        repoID={repoID}
        stateStorageKey="views"
        title={gettext('Views')}
        renderHeaderOperations={renderTreeSectionHeaderOperations}
      >
        {!enableMetadata ? (
          <ExtensionPrompts onExtendedProperties={onExtendedProperties} />
        ) : !isLoading ? (
          <MetadataTreeView userPerm={userPerm} currentPath={currentPath} />
        ) : null}
      </TreeSection>
      {isSettingsDialogOpen && (
        <LibSettingsDialog
          repoID={repoID}
          currentRepoInfo={currentRepoInfo}
          tab={TAB.EXTENDED_PROPERTIES_SETTING}
          toggleDialog={toggleSettingsDialog}
        />
      )}
    </>
  );
};

DirViews.propTypes = {
  userPerm: PropTypes.string,
  repoID: PropTypes.string,
  currentPath: PropTypes.string,
  currentRepoInfo: PropTypes.object.isRequired,
};

export default DirViews;

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TreeSection from '../tree-section';
import { MetadataTreeView, useMetadata } from '../../metadata';
import ExtensionPrompts from './extension-prompts';
import LibSettingsDialog from '../dialog/lib-settings';
import { useMetadataStatus } from '../../hooks';

const DirViews = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const { navigation } = useMetadata();
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

  return (
    <>
      <TreeSection title={gettext('Views')}>
        {!enableMetadata ? (
          <ExtensionPrompts onExtendedProperties={onExtendedProperties} />
        ) : Array.isArray(navigation) && navigation.length > 0 ? (
          <MetadataTreeView userPerm={userPerm} currentPath={currentPath} />
        ) : null}
      </TreeSection>
      {isSettingsDialogOpen && (
        <LibSettingsDialog
          repoID={repoID}
          currentRepoInfo={currentRepoInfo}
          tab="extendedPropertiesSetting"
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

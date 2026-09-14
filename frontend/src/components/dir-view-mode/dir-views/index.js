import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { eventBus, EVENT_BUS_TYPE } from '@/components/event-bus';
import { MetadataTreeView, useMetadata } from '@/features/metadata';
import ViewsMoreOperations from '@/features/metadata/utils/views-more-operations';
import { useMetadataStatus } from '@/hooks';
import { gettext } from '@/utils/constants';
import ExtensionPrompts from '../extension-prompts';
import TreeSection from '../tree-section';

import './index.css';

const DirViews = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const { isLoading } = useMetadata();
  const { enableMetadata, showView } = useMetadataStatus();

  const onExtendedProperties = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TO_SETTINGS_VIEW);
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

  if (enableMetadata && !showView) {
    return null;
  }

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

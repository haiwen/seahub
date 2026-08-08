import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import TreeSection from '../../tree-section';
import ExtensionPrompts from '../extension-prompts';
import ViewsMoreOperations from './views-more-operations';
import { MetadataTreeView, useMetadata } from '../../../metadata';
import { useMetadataStatus } from '../../../hooks';
import { gettext } from '../../../utils/constants';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';

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

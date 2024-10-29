import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TreeSection from '../tree-section';
import { MetadataStatusManagementDialog, MetadataFaceRecognitionDialog, MetadataTreeView, useMetadata } from '../../metadata';
import ExtensionPrompts from './extension-prompts';
import { seafileAPI } from '../../utils/seafile-api';

const DirViews = ({ userPerm, repoID, currentPath, currentRepoInfo }) => {

  const [enableMetadataManagement, setEnableMetadataManagement] = useState(false);
  const [showMetadataStatusManagementDialog, setShowMetadataStatusManagementDialog] = useState(false);
  const [showMetadataFaceRecognitionDialog, setShowMetadataFaceRecognitionDialog] = useState(false);
  const { enableMetadata, updateEnableMetadata, enableFaceRecognition, updateEnableFaceRecognition, navigation } = useMetadata();
  const moreOperations = useMemo(() => {
    if (!enableMetadataManagement || !currentRepoInfo.is_admin) return [];
    let operations = [
      { key: 'extended-properties', value: gettext('Extended properties') }
    ];
    if (enableMetadata) {
      operations.push({ key: 'face-recognition', value: gettext('Face recognition') });
    }
    return operations;
  }, [enableMetadataManagement, enableMetadata, currentRepoInfo]);

  useEffect(() => {
    seafileAPI.getRepoInfo(repoID).then(res => {
      if (res.data.encrypted) {
        setEnableMetadataManagement(false);
      } else {
        setEnableMetadataManagement(window.app.pageOptions.enableMetadataManagement);
      }
    });
  }, [repoID]);

  const moreOperationClick = useCallback((operationKey) => {
    switch (operationKey) {
      case 'extended-properties': {
        setShowMetadataStatusManagementDialog(true);
        break;
      }
      case 'face-recognition': {
        setShowMetadataFaceRecognitionDialog(true);
        break;
      }
      default:
        break;
    }
  }, []);

  const closeMetadataManagementDialog = useCallback(() => {
    setShowMetadataStatusManagementDialog(false);
  }, []);

  const closeMetadataFaceRecognitionDialog = useCallback(() => {
    setShowMetadataFaceRecognitionDialog(false);
  }, []);

  const openMetadataFaceRecognition = useCallback(() => {
    updateEnableFaceRecognition(true);
  }, [updateEnableFaceRecognition]);

  const toggleMetadataStatus = useCallback((value) => {
    updateEnableMetadata(value);
  }, [updateEnableMetadata]);

  const onExtendedProperties = useCallback(() => {
    setShowMetadataStatusManagementDialog(true);
  }, []);

  if (!enableMetadataManagement) return null;

  return (
    <>
      <TreeSection
        title={gettext('Views')}
        moreKey={{ name: 'views' }}
        moreOperations={moreOperations}
        moreOperationClick={moreOperationClick}
      >
        {!enableMetadata ? (
          <ExtensionPrompts onExtendedProperties={onExtendedProperties} />
        ) : Array.isArray(navigation) && navigation.length > 0 ? (
          <MetadataTreeView userPerm={userPerm} currentPath={currentPath} />
        ) : null}
      </TreeSection>
      {showMetadataStatusManagementDialog && (
        <MetadataStatusManagementDialog
          value={enableMetadata}
          repoID={repoID}
          toggle={closeMetadataManagementDialog}
          submit={toggleMetadataStatus}
        />
      )}
      {showMetadataFaceRecognitionDialog && (
        <MetadataFaceRecognitionDialog
          value={enableFaceRecognition}
          repoID={repoID}
          toggle={closeMetadataFaceRecognitionDialog}
          submit={openMetadataFaceRecognition}
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

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { enableRepoAutoDel, enableFaceRecognitionFeature, enableSeafileAI } from '../../../utils/constants';
import { useMetadataStatus } from '../../../hooks';
import Loading from '../../../components/loading';
import LibHistorySettingPanel from './lib-history-setting-panel';
import LibAutoDelSettingPanel from './lib-old-files-auto-del-setting-panel';
import {
  MetadataStatusManagementDialog as LibExtendedPropertiesSettingPanel,
  MetadataFaceRecognitionDialog as LibFaceRecognitionSettingPanel,
  MetadataTagsStatusDialog as LibMetadataTagsStatusSettingPanel,
  useMetadata
} from '../../../metadata';

import './index.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
};

const LibSettingsDialog = ({ repoID, currentRepoInfo, showMigrateTip, onMigrateSuccess }) => {
  const [isMigrating, setIsMigrating] = useState(false);

  const { encrypted, is_admin } = currentRepoInfo;
  const { enableMetadataManagement } = window.app.pageOptions;
  const { updateEnableFaceRecognition } = useMetadata();
  const { enableMetadata, updateEnableMetadata, enableTags, tagsLang, updateEnableTags, enableFaceRecognition, globalHiddenColumns, modifyGlobalHiddenColumns } = useMetadataStatus();
  const enableHistorySetting = is_admin; // repo owner, admin of the department which the repo belongs to, and ...
  const enableAutoDelSetting = is_admin && enableRepoAutoDel;
  const enableExtendedPropertiesSetting = !encrypted && is_admin && enableMetadataManagement;

  const handleMigrateStart = useCallback(() => {
    setIsMigrating(true);
  }, []);

  const handleMigrateEnd = useCallback(() => {
    setIsMigrating(false);
    onMigrateSuccess && onMigrateSuccess();
  }, [onMigrateSuccess]);

  const handleMigrateError = useCallback(() => {
    setIsMigrating(false);
  }, []);

  return (
    <div className='p-4'>
      {isMigrating && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1050
        }}>
          <Loading />
        </div>
      )}
      {enableHistorySetting && (
        <LibHistorySettingPanel
          repoID={repoID}
        />
      )}
      {enableAutoDelSetting && (
        <LibAutoDelSettingPanel
          repoID={repoID}
        />
      )}
      {enableExtendedPropertiesSetting && (
        <LibExtendedPropertiesSettingPanel
          repoID={repoID}
          value={enableMetadata}
          hiddenColumns={globalHiddenColumns}
          modifyHiddenColumns={modifyGlobalHiddenColumns}
          submit={updateEnableMetadata}
        />
      )}
      {enableExtendedPropertiesSetting && enableFaceRecognitionFeature && (
        <LibFaceRecognitionSettingPanel
          repoID={repoID}
          value={enableFaceRecognition}
          submit={updateEnableFaceRecognition}
          enableMetadata={enableMetadata}
        />
      )}
      {enableExtendedPropertiesSetting && (
        <LibMetadataTagsStatusSettingPanel
          repoID={repoID}
          value={enableTags}
          lang={tagsLang}
          enableAI={enableSeafileAI}
          submit={updateEnableTags}
          enableMetadata={enableMetadata}
          showMigrateTip={showMigrateTip}
          onMigrateSuccess={handleMigrateEnd}
          onMigrateError={handleMigrateError}
          onMigrateStart={handleMigrateStart}
        />
      )}
    </div>
  );
};

LibSettingsDialog.propTypes = propTypes;

export default LibSettingsDialog;

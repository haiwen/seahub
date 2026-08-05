import React from 'react';
import PropTypes from 'prop-types';
import { enableRepoAutoDel, enableFaceRecognitionFeature, enableSeafileAI, enableAIChat } from '../../../utils/constants';
import { useMetadataStatus } from '../../../hooks';
import LibHistorySettingPanel from './lib-history-setting-panel';
import LibAutoDelSettingPanel from './lib-old-files-auto-del-setting-panel';
import {
  MetadataStatusManagementDialog as LibExtendedPropertiesSettingPanel,
  MetadataAISummaryStatusDialog as LibAISummarySettingPanel,
  MetadataFaceRecognitionDialog as LibFaceRecognitionSettingPanel,
  MetadataTagsStatusDialog as LibMetadataTagsStatusSettingPanel,
  useMetadata
} from '../../../metadata';

import './index.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isMigrationTipShown: PropTypes.bool
};

const LibSettings = ({ repoID, currentRepoInfo, isMigrationTipShown }) => {
  const { encrypted, is_admin } = currentRepoInfo;
  const { enableMetadataManagement } = window.app.pageOptions;
  const { updateEnableFaceRecognition } = useMetadata();
  const {
    enableMetadata, updateEnableMetadata,
    enableTags, tagsLang, updateEnableTags,
    enableAISummary, updateEnableAISummary,
    enableFaceRecognition, globalHiddenColumns, modifyGlobalHiddenColumns
  } = useMetadataStatus();
  const enableHistorySetting = is_admin; // repo owner, admin of the department which the repo belongs to, and ...
  const enableAutoDelSetting = is_admin && enableRepoAutoDel;
  const enableExtendedPropertiesSetting = !encrypted && is_admin && enableMetadataManagement;

  return (
    <div className='p-4'>
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
      {(enableExtendedPropertiesSetting && enableSeafileAI && enableAIChat) && (
        <LibAISummarySettingPanel
          repoID={repoID}
          value={enableAISummary}
          submit={updateEnableAISummary}
          enableMetadata={enableMetadata}
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
          isMigrationTipShown={isMigrationTipShown}
        />
      )}
    </div>
  );
};

LibSettings.propTypes = propTypes;

export default LibSettings;

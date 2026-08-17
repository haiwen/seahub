import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { globalHistory, Link } from '@gatsbyjs/reach-router';
import { enableRepoAutoDel, enableFaceRecognitionFeature, enableSeafileAI, enableAIChat, gettext, siteRoot } from '../../../utils/constants';
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

const GAP = 32;
const TAB = {
  GENERAL: 'general',
  METADATA_AI: 'metadata-ai',
};

const getActiveTab = (search) => {
  return new URLSearchParams(search).get('tab') === TAB.METADATA_AI ? TAB.METADATA_AI : TAB.GENERAL;
};

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isMigrationTipShown: PropTypes.bool
};

const LibSettings = ({ repoID, currentRepoInfo, isMigrationTipShown }) => {
  const [activeTab, setActiveTab] = useState(() => isMigrationTipShown ? TAB.METADATA_AI : getActiveTab(window.location.search));
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef([]);
  const { encrypted, is_admin, repo_name: repoName } = currentRepoInfo;
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
  const settingsURL = `${siteRoot}library/${repoID}/${encodeURIComponent(repoName)}/?settings=true`;

  useEffect(() => {
    return globalHistory.listen(({ location }) => {
      setActiveTab(getActiveTab(location.search));
    });
  }, []);

  useEffect(() => {
    if (isMigrationTipShown) {
      setActiveTab(TAB.METADATA_AI);
    }
  }, [isMigrationTipShown]);

  useLayoutEffect(() => {
    const activeIndex = activeTab === TAB.GENERAL ? 0 : 1;
    const itemWidths = tabRefs.current.map(ref => ref?.offsetWidth || 0);
    const indicatorWidth = itemWidths[activeIndex];
    if (!indicatorWidth) return;

    const indicatorOffset = itemWidths.slice(0, activeIndex).reduce((total, width) => total + width, 0) + activeIndex * GAP;

    setIndicatorStyle({
      '--indicator-width': `${indicatorWidth}px`,
      '--indicator-offset': `${indicatorOffset}px`,
    });
  }, [activeTab]);

  const onTabKeyDown = (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      event.currentTarget.click();
      return;
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const currentIndex = event.currentTarget.id === 'library-settings-general-tab' ? 0 : 1;
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (currentIndex + direction + tabRefs.current.length) % tabRefs.current.length;
    const nextTab = tabRefs.current[nextIndex]?.querySelector('[role="tab"]');
    if (!nextTab) return;

    nextTab.focus();
    nextTab.click();
  };

  return (
    <div>
      <div className="cur-view-path">
        <ul
          className="nav nav-indicator-container position-relative gap-6"
          role="tablist"
          style={indicatorStyle}
        >
          <li className="nav-item" role="presentation" ref={el => tabRefs.current[0] = el}>
            <Link
              to={settingsURL}
              className={`m-0 nav-link${activeTab === TAB.GENERAL ? ' active' : ''}`}
              id="library-settings-general-tab"
              role="tab"
              aria-selected={activeTab === TAB.GENERAL}
              aria-controls="library-settings-general-panel"
              onKeyDown={onTabKeyDown}
            >
              {gettext('General')}
            </Link>
          </li>
          <li className="nav-item" role="presentation" ref={el => tabRefs.current[1] = el}>
            <Link
              to={`${settingsURL}&tab=${TAB.METADATA_AI}`}
              className={`m-0 nav-link${activeTab === TAB.METADATA_AI ? ' active' : ''}`}
              id="library-settings-metadata-ai-tab"
              role="tab"
              aria-selected={activeTab === TAB.METADATA_AI}
              aria-controls="library-settings-metadata-ai-panel"
              onKeyDown={onTabKeyDown}
            >
              {gettext('Metadata & AI')}
            </Link>
          </li>
        </ul>
      </div>
      <div
        className="p-4"
        id="library-settings-general-panel"
        role="tabpanel"
        aria-labelledby="library-settings-general-tab"
        hidden={activeTab !== TAB.GENERAL}
      >
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
      </div>
      <div
        className="p-4"
        id="library-settings-metadata-ai-panel"
        role="tabpanel"
        aria-labelledby="library-settings-metadata-ai-tab"
        hidden={activeTab !== TAB.METADATA_AI}
      >
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
    </div>
  );
};

LibSettings.propTypes = propTypes;

export default LibSettings;

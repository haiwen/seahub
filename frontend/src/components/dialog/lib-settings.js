import React, { Fragment, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, enableRepoAutoDel } from '../../utils/constants';
import LibHistorySettingPanel from './lib-settings/lib-history-setting-panel';
import LibAutoDelSettingPanel from './lib-settings/lib-old-files-auto-del-setting-panel';
import {
  MetadataStatusManagementDialog as LibExtendedPropertiesSettingPanel,
  MetadataFaceRecognitionDialog as LibFaceRecognitionSettingPanel,
  MetadataTagsStatusDialog as LibMetadataTagsStatusSettingPanel,
  useMetadata
} from '../../metadata';
import { useMetadataStatus } from '../../hooks';

import '../../css/lib-settings.css';

const TAB = {
  HISTORY_SETTING: 'history_setting',
  AUTO_DEL_SETTING: 'auto_delete_setting',
  EXTENDED_PROPERTIES_SETTING: 'extended_properties_setting',
  FACE_RECOGNITION_SETTING: 'face_recognition_setting',
  TAGS_SETTING: 'tags_setting'
};

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired
};

const LibSettingsDialog = ({ repoID, currentRepoInfo, toggleDialog, tab }) => {
  const [activeTab, setActiveTab] = useState(tab || TAB.HISTORY_SETTING);

  const toggleTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const onTabKeyDown = useCallback((e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }, []);

  const { encrypted, is_admin } = currentRepoInfo;
  const { enableMetadataManagement } = window.app.pageOptions;
  const { enableFaceRecognition, updateEnableFaceRecognition } = useMetadata();
  const { enableMetadata, updateEnableMetadata, enableTags, tagsLang, updateEnableTags } = useMetadataStatus();
  const enableHistorySetting = is_admin; // repo owner, admin of the department which the repo belongs to, and ...
  const enableAutoDelSetting = is_admin && enableRepoAutoDel;
  const enableExtendedPropertiesSetting = !encrypted && is_admin && enableMetadataManagement;
  const enableMetadataOtherSettings = enableExtendedPropertiesSetting && enableMetadata;

  return (
    <div>
      <Modal isOpen={true} className="lib-settings-dialog" toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>
          {gettext('Settings')}
        </ModalHeader>
        <ModalBody className="d-md-flex p-md-0" role="tablist">
          <Fragment>
            <div className="lib-setting-nav p-4">
              <Nav pills className="flex-column">
                {enableHistorySetting && (
                  <NavItem role="tab" aria-selected={activeTab === TAB.HISTORY_SETTING} aria-controls="history-setting-panel">
                    <NavLink className={activeTab === TAB.HISTORY_SETTING ? 'active' : ''} onClick={(toggleTab.bind(this, TAB.HISTORY_SETTING))} tabIndex="0" onKeyDown={onTabKeyDown}>
                      {gettext('History')}
                    </NavLink>
                  </NavItem>
                )}
                {enableAutoDelSetting && (
                  <NavItem role="tab" aria-selected={activeTab === TAB.AUTO_DEL_SETTING} aria-controls="auto-del-setting-panel">
                    <NavLink className={activeTab === TAB.AUTO_DEL_SETTING ? 'active' : ''} onClick={toggleTab.bind(this, TAB.AUTO_DEL_SETTING)} tabIndex="0" onKeyDown={onTabKeyDown}>
                      {gettext('Auto deletion')}
                    </NavLink>
                  </NavItem>
                )}
                {enableExtendedPropertiesSetting && (
                  <NavItem role="tab" aria-selected={activeTab === TAB.EXTENDED_PROPERTIES_SETTING} aria-controls="extended-properties-setting-panel">
                    <NavLink className={activeTab === TAB.EXTENDED_PROPERTIES_SETTING ? 'active' : ''} onClick={toggleTab.bind(this, TAB.EXTENDED_PROPERTIES_SETTING)} tabIndex="0" onKeyDown={onTabKeyDown}>
                      {gettext('Extended properties')}
                    </NavLink>
                  </NavItem>
                )}
                {enableMetadataOtherSettings && (
                  <NavItem role="tab" aria-selected={activeTab === TAB.FACE_RECOGNITION_SETTING} aria-controls="face-recognition-setting-panel">
                    <NavLink className={activeTab === TAB.FACE_RECOGNITION_SETTING ? 'active' : ''} onClick={toggleTab.bind(this, TAB.FACE_RECOGNITION_SETTING)} tabIndex="0" onKeyDown={onTabKeyDown}>
                      {gettext('Face recognition')}
                    </NavLink>
                  </NavItem>
                )}
                {enableMetadataOtherSettings && (
                  <NavItem role="tab" aria-selected={activeTab === TAB.TAGS_SETTING} aria-controls="tags-setting-panel">
                    <NavLink className={activeTab === TAB.TAGS_SETTING ? 'active' : ''} onClick={toggleTab.bind(this, TAB.TAGS_SETTING)} tabIndex="0" onKeyDown={onTabKeyDown}>
                      {gettext('Tags')}
                    </NavLink>
                  </NavItem>
                )}
              </Nav>
            </div>
            <TabContent activeTab={activeTab} className="flex-fill">
              {(enableHistorySetting && activeTab === TAB.HISTORY_SETTING) && (
                <TabPane tabId={TAB.HISTORY_SETTING} role="tabpanel" id="history-setting-panel">
                  <LibHistorySettingPanel
                    repoID={repoID}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              )}
              {(enableAutoDelSetting && activeTab === TAB.AUTO_DEL_SETTING) && (
                <TabPane tabId={TAB.AUTO_DEL_SETTING} role="tabpanel" id="auto-del-setting-panel">
                  <LibAutoDelSettingPanel
                    repoID={repoID}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              )}
              {(enableExtendedPropertiesSetting && activeTab === TAB.EXTENDED_PROPERTIES_SETTING) && (
                <TabPane tabId={TAB.EXTENDED_PROPERTIES_SETTING} role="tabpanel" id="extended-properties-setting-panel">
                  <LibExtendedPropertiesSettingPanel
                    repoID={repoID}
                    value={enableMetadata}
                    submit={updateEnableMetadata}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              )}
              {(enableMetadataOtherSettings && activeTab === TAB.FACE_RECOGNITION_SETTING) && (
                <TabPane tabId={TAB.FACE_RECOGNITION_SETTING} role="tabpanel" id="face-recognition-setting-panel">
                  <LibFaceRecognitionSettingPanel
                    repoID={repoID}
                    value={enableFaceRecognition}
                    submit={updateEnableFaceRecognition}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              )}
              {(enableMetadataOtherSettings && activeTab === TAB.TAGS_SETTING) && (
                <TabPane tabId={TAB.TAGS_SETTING} role="tabpanel" id="tags-setting-panel">
                  <LibMetadataTagsStatusSettingPanel
                    repoID={repoID}
                    value={enableTags}
                    lang={tagsLang}
                    submit={updateEnableTags}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              )}
            </TabContent>
          </Fragment>
        </ModalBody>
      </Modal>
    </div>
  );
};

LibSettingsDialog.propTypes = propTypes;

export default LibSettingsDialog;

export { TAB };

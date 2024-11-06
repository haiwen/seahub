import React, { Fragment, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, enableRepoAutoDel } from '../../utils/constants';
import LibHistorySettingPanel from './lib-settings/lib-history-setting-panel';
import LibAutoDelSettingPanel from './lib-settings/lib-old-files-auto-del-setting-panel';
import {
  MetadataStatusManagementDialog as LibExtendedPropertiesSettingPanel,
  MetadataFaceRecognitionDialog as LibFaceRecognitionSettingPanel,
  useMetadata
} from '../../metadata';

import '../../css/lib-settings.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired
};

const LibSettingsDialog = ({ repoID, currentRepoInfo, toggleDialog, tab }) => {
  let [activeTab, setActiveTab] = useState(tab || 'historySetting');

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
  const { enableMetadata, updateEnableMetadata, enableFaceRecognition, updateEnableFaceRecognition } = useMetadata();
  const enableHistorySetting = is_admin; // repo owner, admin of the department which the repo belongs to, and ...
  const enableAutoDelSetting = is_admin && enableRepoAutoDel;
  const enableExtendedPropertiesSetting = !encrypted && is_admin && enableMetadataManagement;
  const enableFaceRecognitionSetting = enableExtendedPropertiesSetting && enableMetadata;

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
                {enableHistorySetting &&
                <NavItem role="tab" aria-selected={activeTab === 'historySetting'} aria-controls="history-setting-panel">
                  <NavLink className={activeTab === 'historySetting' ? 'active' : ''} onClick={(toggleTab.bind(this, 'historySetting'))} tabIndex="0" onKeyDown={onTabKeyDown}>
                    {gettext('History')}
                  </NavLink>
                </NavItem>
                }
                {enableAutoDelSetting &&
                <NavItem role="tab" aria-selected={activeTab === 'autoDelSetting'} aria-controls="auto-del-setting-panel">
                  <NavLink className={activeTab === 'autoDelSetting' ? 'active' : ''} onClick={toggleTab.bind(this, 'autoDelSetting')} tabIndex="0" onKeyDown={onTabKeyDown}>
                    {gettext('Auto deletion')}
                  </NavLink>
                </NavItem>
                }
                {enableExtendedPropertiesSetting &&
                <NavItem role="tab" aria-selected={activeTab === 'extendedPropertiesSetting'} aria-controls="extended-properties-setting-panel">
                  <NavLink className={activeTab === 'extendedPropertiesSetting' ? 'active' : ''} onClick={toggleTab.bind(this, 'extendedPropertiesSetting')} tabIndex="0" onKeyDown={onTabKeyDown}>
                    {gettext('Extended properties')}
                  </NavLink>
                </NavItem>
                }
                {enableFaceRecognitionSetting &&
                <NavItem role="tab" aria-selected={activeTab === 'faceRecognitionSetting'} aria-controls="face-recognition-setting-panel">
                  <NavLink className={activeTab === 'faceRecognitionSetting' ? 'active' : ''} onClick={toggleTab.bind(this, 'faceRecognitionSetting')} tabIndex="0" onKeyDown={onTabKeyDown}>
                    {gettext('Face recognition')}
                  </NavLink>
                </NavItem>
                }
              </Nav>
            </div>
            <TabContent activeTab={activeTab} className="flex-fill">
              {(enableHistorySetting && activeTab === 'historySetting') &&
                <TabPane tabId="historySetting" role="tabpanel" id="history-setting-panel">
                  <LibHistorySettingPanel
                    repoID={repoID}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              }
              {(enableAutoDelSetting && activeTab === 'autoDelSetting') &&
                <TabPane tabId="autoDelSetting" role="tabpanel" id="auto-del-setting-panel">
                  <LibAutoDelSettingPanel
                    repoID={repoID}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              }
              {(enableExtendedPropertiesSetting && activeTab === 'extendedPropertiesSetting') &&
                <TabPane tabId="extendedPropertiesSetting" role="tabpanel" id="extended-properties-setting-panel">
                  <LibExtendedPropertiesSettingPanel
                    repoID={repoID}
                    value={enableMetadata}
                    submit={(value) => { updateEnableMetadata(value); }}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              }
              {(enableFaceRecognitionSetting && activeTab === 'faceRecognitionSetting') &&
                <TabPane tabId="faceRecognitionSetting" role="tabpanel" id="face-recognition-setting-panel">
                  <LibFaceRecognitionSettingPanel
                    repoID={repoID}
                    value={enableFaceRecognition}
                    submit={(value) => { updateEnableFaceRecognition(value); }}
                    toggleDialog={toggleDialog}
                  />
                </TabPane>
              }
            </TabContent>
          </Fragment>
        </ModalBody>
      </Modal>
    </div>
  );
};

LibSettingsDialog.propTypes = propTypes;

export default LibSettingsDialog;

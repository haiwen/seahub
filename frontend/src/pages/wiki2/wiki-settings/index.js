import React, { Fragment, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import LinkedRepoPanel from './linked-repo-panel';
import { gettext } from '../../../utils/constants';

import './index.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
};

const TAB = {
  SETTINGS: 'settings',
};

const WikiSettingsDialog = ({ toggleDialog }) => {
  const [activeTab, setActiveTab] = useState(TAB.SETTINGS);
  const toggleTab = useCallback((event) => {
    const { tab } = event.target.data;
    setActiveTab(tab);
  }, []);

  const onTabKeyDown = useCallback((e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }, []);

  return (
    <div>
      <Modal isOpen={true} className="wiki-settings-dialog" toggle={toggleDialog}>
        <SeahubModalHeader toggle={toggleDialog}>{gettext('Settings')}</SeahubModalHeader>
        <ModalBody className="d-md-flex p-md-0" role="tablist">
          <Fragment>
            <div className="wiki-setting-nav p-4">
              <Nav pills className="flex-column">
                <NavItem role="tab" aria-selected={activeTab === TAB.SETTINGS} aria-controls="linked-repo-panel">
                  <NavLink
                    tabIndex="0"
                    data-tab={TAB.SETTINGS}
                    className={activeTab === TAB.SETTINGS ? 'active' : ''}
                    onClick={toggleTab}
                    onKeyDown={onTabKeyDown}
                  >
                    {gettext('Connected Libraries')}
                  </NavLink>
                </NavItem>
              </Nav>
            </div>
            <TabContent activeTab={activeTab} className="flex-fill">
              {activeTab === TAB.SETTINGS && (
                <TabPane tabId={TAB.SETTINGS} role="tabpanel" id="linked-repo-panel">
                  <LinkedRepoPanel />
                </TabPane>
              )}
            </TabContent>
          </Fragment>
        </ModalBody>
      </Modal>
    </div>
  );
};

WikiSettingsDialog.propTypes = propTypes;

export default WikiSettingsDialog;

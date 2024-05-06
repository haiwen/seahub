import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import AppSettingsDialogIconColor from './app-settings-dialog-icon-color';
import AppSettingsDialogName from './app-settings-dialog-name';
import { gettext } from '../../../../utils/constants';

import './app-left-bar-dialog.css';

class AppSettingsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'Name',
    };
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  };

  renderContent = () => {
    const { activeTab } = this.state;
    return (
      <Fragment>
        <div className="app-settings-dialog-side">
          <Nav pills vertical className="w-100">
            <NavItem>
              <NavLink
                className={activeTab === 'Name' ? 'active' : ''}
                onClick={this.toggle.bind(this, 'Name')}
              >
                {gettext('Wiki name')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'Icon' ? 'active' : ''}
                onClick={this.toggle.bind(this, 'Icon')}
              >
                {gettext('Icons')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="app-settings-dialog-main">
          <TabContent activeTab={activeTab}>
            <TabPane tabId="Icon">
              <AppSettingsDialogIconColor
                config={this.props.config}
                repoId={this.props.repoId}
                updateConfig={this.props.updateConfig}
              />
            </TabPane>
            <TabPane tabId="Name">
              <AppSettingsDialogName
                config={this.props.config}
                updateConfig={this.props.updateConfig}
              />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle} className="app-settings-dialog">
        <ModalHeader toggle={this.props.toggle}>{gettext('Wiki settings')}</ModalHeader>
        <ModalBody className="app-settings-dialog-content">
          {this.renderContent()}
        </ModalBody>
      </Modal>
    );
  }
}

AppSettingsDialog.propTypes = {
  repoId: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
};

export default AppSettingsDialog;

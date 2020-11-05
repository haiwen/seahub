import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import LibSubFolderSetUserPermissionDialog from './lib-sub-folder-set-user-permission-dialog';
import LibSubFolderSetGroupPermissionDialog from './lib-sub-folder-set-group-permission-dialog';
import '../../css/share-link-dialog.css';
import '../../css/sub-folder-permission.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string,
  isDepartmentRepo: PropTypes.bool,
  folderPath: PropTypes.string,
  folderName: PropTypes.string,
  toggleDialog: PropTypes.func.isRequired
};

class LibSubFolderPermissionDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'userPermission'
    };
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
  }

  renderContent = () => {
    let activeTab = this.state.activeTab;

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            <NavItem>
              <NavLink className={activeTab === 'userPermission' ? 'active' : ''} onClick={this.toggle.bind(this, 'userPermission')}>
                {gettext('User Permission')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={activeTab === 'groupPermission' ? 'active' : ''} onClick={this.toggle.bind(this, 'groupPermission')}>
                {gettext('Group Permission')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="userPermission">
              <LibSubFolderSetUserPermissionDialog repoID={this.props.repoID} repoName={this.props.repoName} folderPath={this.props.folderPath} isDepartmentRepo={this.props.isDepartmentRepo} />
            </TabPane>
            <TabPane tabId="groupPermission">
              <LibSubFolderSetGroupPermissionDialog repoID={this.props.repoID} repoName={this.props.repoName} folderPath={this.props.folderPath} isDepartmentRepo={this.props.isDepartmentRepo} />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  }

  render() {
    const { repoName, folderName } = this.props;

    return (
      <div>
        <Modal isOpen={true} style={{maxWidth: '980px'}} className="share-dialog" toggle={this.props.toggleDialog}>
          <ModalHeader toggle={this.props.toggleDialog}>
            <span dangerouslySetInnerHTML={{__html: repoName ? Utils.generateDialogTitle(gettext('{placeholder} Folder Permission'), repoName) : Utils.generateDialogTitle(gettext('Set {placeholder}\'s permission'), folderName)}}></span>
          </ModalHeader>
          <ModalBody className="dialog-list-container share-dialog-content">
            {this.renderContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

LibSubFolderPermissionDialog.propTypes = propTypes;

export default LibSubFolderPermissionDialog;

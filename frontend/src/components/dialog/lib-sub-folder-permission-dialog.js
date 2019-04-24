import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap'; 
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import LibSubFolderSetUserPermissionDialog from './lib-sub-folder-set-user-permission-dialog';
import LibSubFolderSetGroupPermissionDialog from './lib-sub-folder-set-group-permission-dialog';
import '../../css/share-link-dialog.css';

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

  renderDirContent = () => {
    let activeTab = this.state.activeTab;
    
    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills vertical>
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
              <LibSubFolderSetUserPermissionDialog repoID={this.props.repoID} repoName={this.props.repoName} folderPath={this.props.folderPath}  />
            </TabPane>
            <TabPane tabId="groupPermission">
              <LibSubFolderSetGroupPermissionDialog repoID={this.props.repoID} repoName={this.props.repoName} folderPath={this.props.folderPath} />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  }


  render() {
    let { repoName, folderName } = this.props;
    let title = gettext("Set {folderName}'s Permission");
        title = title.replace('{folderName}', '<span class="op-target mr-1">' + Utils.HTMLescape(folderName) + '</span>');
  
    return (
      <div>
        <Modal isOpen={true} style={{maxWidth: '980px'}} className="share-dialog" toggle={this.props.toggleDialog}>
          {repoName ?
          <ModalHeader toggle={this.props.toggleDialog}><span className="op-target mr-1" title={repoName}>{repoName}</span>{gettext('Folder Permission')}</ModalHeader> :
          <ModalHeader toggle={this.props.toggleDialog}><div dangerouslySetInnerHTML={{__html: title}} /></ModalHeader>
          }
          <ModalBody className="dialog-list-container share-dialog-content">
            {this.renderDirContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

export default LibSubFolderPermissionDialog;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, LARGE_DIALOG_STYLE } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import LibSubFolderSetUserPermissionDialog from './lib-sub-folder-set-user-permission-dialog';
import LibSubFolderSetGroupPermissionDialog from './lib-sub-folder-set-group-permission-dialog';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/share-link-dialog.css';
import '../../css/lib-sub-folder-permission-dialog.css';

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
      this.setState({ activeTab: tab });
    }
  };

  renderContent = () => {
    const activeTab = this.state.activeTab;

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            <NavItem role="tab" aria-selected={activeTab === 'userPermission'} aria-controls="user-perm-panel">
              <NavLink
                className={activeTab === 'userPermission' ? 'active' : ''}
                onClick={this.toggle.bind(this, 'userPermission')}
                tabIndex="0"
                onKeyDown={Utils.onKeyDown}
              >
                {gettext('User Permission')}
              </NavLink>
            </NavItem>
            <NavItem role="tab" aria-selected={activeTab === 'groupPermission'} aria-controls="group-perm-panel">
              <NavLink
                className={activeTab === 'groupPermission' ? 'active' : ''}
                onClick={this.toggle.bind(this, 'groupPermission')}
                tabIndex="0"
                onKeyDown={Utils.onKeyDown}
              >
                {gettext('Group Permission')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="share-dialog-main lib-sub-folder-permission-dialog-content">
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="userPermission" role="tabpanel" id="user-perm-panel">
              <LibSubFolderSetUserPermissionDialog
                repoID={this.props.repoID}
                repoName={this.props.repoName}
                folderPath={this.props.folderPath}
                isDepartmentRepo={this.props.isDepartmentRepo}
              />
            </TabPane>
            <TabPane tabId="groupPermission" role="tabpanel" id="group-perm-panel">
              <LibSubFolderSetGroupPermissionDialog
                repoID={this.props.repoID}
                repoName={this.props.repoName}
                folderPath={this.props.folderPath}
                isDepartmentRepo={this.props.isDepartmentRepo}
              />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    const { repoName, folderName } = this.props;
    let title = repoName ? gettext('{placeholder} Folder Permission') : gettext('Set permission of {placeholder}');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName || folderName) + '</span>');
    return (
      <div>
        <Modal isOpen={true} style={LARGE_DIALOG_STYLE} className="share-dialog" toggle={this.props.toggleDialog}>
          <SeahubModalHeader toggle={this.props.toggleDialog}>
            <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
          </SeahubModalHeader>
          <ModalBody className="dialog-list-container share-dialog-content" role="tablist">
            {this.renderContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

LibSubFolderPermissionDialog.propTypes = propTypes;

export default LibSubFolderPermissionDialog;

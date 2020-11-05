import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SysAdminShareToUser from './sysadmin-share-to-user';
import SysAdminShareToGroup from './sysadmin-share-to-group';
import '../../../css/share-link-dialog.css';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  itemPath: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool,
  userPerm: PropTypes.string,
  enableDirPrivateShare: PropTypes.bool
};

class SysAdminShareDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: this.getInitialActiveTab(),
      isRepoOwner: false
    };
  }

  getInitialActiveTab = () => {
    return 'shareToUser';
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
  }

  renderDirContent = () => {
    let activeTab = this.state.activeTab;
    const { enableDirPrivateShare, isGroupOwnedRepo } = this.props;
    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            {enableDirPrivateShare &&
              <Fragment>
                <NavItem>
                  <NavLink className={activeTab === 'shareToUser' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToUser')}>
                    {gettext('Share to user')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToGroup')}>
                    {gettext('Share to group')}
                  </NavLink>
                </NavItem>
              </Fragment>
            }
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            {enableDirPrivateShare &&
              <Fragment>
                <TabPane tabId="shareToUser">
                  <SysAdminShareToUser itemType={'library'} isGroupOwnedRepo={isGroupOwnedRepo} itemPath={this.props.itemPath} repoID={this.props.repoID} isRepoOwner={this.state.isRepoOwner}/>
                </TabPane>
                <TabPane tabId="shareToGroup">
                  <SysAdminShareToGroup itemType={'library'} isGroupOwnedRepo={isGroupOwnedRepo} itemPath={this.props.itemPath} repoID={this.props.repoID} isRepoOwner={this.state.isRepoOwner}/>
                </TabPane>
              </Fragment>
            }
          </TabContent>
        </div>
      </Fragment>
    );
  }

  render() {
    return (
      <div>
        <Modal isOpen={true} style={{maxWidth: '720px'}} className="share-dialog" toggle={this.props.toggleDialog}>
          <ModalHeader toggle={this.props.toggleDialog}>{gettext('Share')} <span className="op-target" title={this.props.itemName}>{this.props.itemName}</span></ModalHeader>
          <ModalBody className="share-dialog-content">
            {this.renderDirContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

SysAdminShareDialog.propTypes = propTypes;

export default SysAdminShareDialog;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap'; 
import { gettext, canGenerateShareLink, canGenerateUploadLink } from '../../utils/constants';
import ShareToUser from './share-to-user';
import ShareToGroup from './share-to-group';
import GenerateShareLink from './generate-share-link';
import GenerateUploadLink from './generate-upload-link';
import '../../css/share-link-dialog.css';

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemType: PropTypes.string.isRequired, // there will be three choose: ['library', 'dir', 'file']
  itemName: PropTypes.string.isRequired,
  itemPath: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool,
  userPerm: PropTypes.string,
  enableDirPrivateShare: PropTypes.bool,
};

class ShareDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: this.getInitialActiveTab()
    };
  }

  getInitialActiveTab = () => {
    const {repoEncrypted, userPerm, enableDirPrivateShare} = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;
    const enableUploadLink = !repoEncrypted && canGenerateUploadLink && userPerm == 'rw';

    if (enableShareLink) {
      return 'shareLink';
    } else if (enableUploadLink) {
      return 'uploadLink';
    } else if (enableDirPrivateShare) {
      return 'shareToUser';
    }
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
  }

  renderDirContent = () => {
    let activeTab = this.state.activeTab;

    const {repoEncrypted, userPerm, enableDirPrivateShare} = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;
    const enableUploadLink = !repoEncrypted && canGenerateUploadLink && userPerm == 'rw';

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills vertical>
            {enableShareLink &&
              <NavItem>
                <NavLink className={activeTab === 'shareLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareLink')}>
                  {gettext('Share Link')}
                </NavLink>
              </NavItem>
            }
            {enableUploadLink &&
              <NavItem>
                <NavLink className={activeTab === 'uploadLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLink')}>
                  {gettext('Upload Link')}
                </NavLink>
              </NavItem>
            }
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
            {enableShareLink &&
              <TabPane tabId="shareLink">
                <GenerateShareLink 
                  itemPath={this.props.itemPath} 
                  repoID={this.props.repoID}
                  closeShareDialog={this.props.toggleDialog} 
                />
              </TabPane>
            }
            {enableUploadLink &&
              <TabPane tabId="uploadLink">
                <GenerateUploadLink 
                  itemPath={this.props.itemPath} 
                  repoID={this.props.repoID} 
                  closeShareDialog={this.props.toggleDialog} 
                />
              </TabPane>
            }
            {enableDirPrivateShare &&
              <Fragment>
                <TabPane tabId="shareToUser">
                  <ShareToUser isGroupOwnedRepo={this.props.isGroupOwnedRepo} itemPath={this.props.itemPath} repoID={this.props.repoID} />
                </TabPane>
                <TabPane tabId="shareToGroup">
                  <ShareToGroup isGroupOwnedRepo={this.props.isGroupOwnedRepo} itemPath={this.props.itemPath} repoID={this.props.repoID} />
                </TabPane>
              </Fragment>
            }
          </TabContent>
        </div>
      </Fragment>
    );
  }

  renderFileContent = () => {
    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills vertical>
            <NavItem>
              <NavLink
                className="active" onClick={() => {this.toggle.bind(this, 'shareLink');}}>
                {gettext('Share Link')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="shareLink">
              <GenerateShareLink 
                itemPath={this.props.itemPath} 
                repoID={this.props.repoID} 
                closeShareDialog={this.props.toggleDialog}
              />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  }

  render() {
    const { itemType, itemName, repoEncrypted } = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;
    return (
      <div>
        <Modal isOpen={true} style={{maxWidth: '720px'}} className="share-dialog">
          <ModalHeader toggle={this.props.toggleDialog}>{gettext('Share')} <span className="op-target" title={itemName}>{itemName}</span></ModalHeader>
          <ModalBody className="dialog-list-container share-dialog-content">
            {(itemType === 'library' || itemType === 'dir') && this.renderDirContent()}
            {(itemType === 'file' && enableShareLink) && this.renderFileContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

ShareDialog.propTypes = propTypes;

export default ShareDialog;

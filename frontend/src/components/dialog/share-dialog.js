import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, username, canGenerateShareLink, canGenerateUploadLink, canInvitePeople, additionalShareDialogNote, enableOCM, isPro } from '../../utils/constants';
import ShareLinkPanel from '../share-link-panel';
import GenerateUploadLink from './generate-upload-link';
import ShareToUser from './share-to-user';
import ShareToGroup from './share-to-group';
import ShareToInvitePeople from './share-to-invite-people';
import ShareToOtherServer from './share-to-other-server';
import InternalLink from './internal-link';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import toaster from '../toast';
import CustomPermissionManager from './custom-permission/custom-permission-manager';

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
      activeTab: this.getInitialActiveTab(),
      isRepoJudgemented: false,
      isRepoOwner: false,
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    seafileAPI.getRepoInfo(repoID).then(res => {
      let isRepoOwner = res.data.owner_email === username;
      this.setState({
        isRepoJudgemented: true,
        isRepoOwner: isRepoOwner,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getInitialActiveTab = () => {
    let { repoEncrypted, userPerm, enableDirPrivateShare, itemType } = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;
    const enableUploadLink = !repoEncrypted && canGenerateUploadLink && (userPerm == 'rw' || userPerm == 'admin');

    // for encrypted repo, 'dir private share' is only enabled for the repo itself,
    // not for the folders in it.
    if (repoEncrypted) {
      enableDirPrivateShare = itemType == 'library';
    }

    if (enableShareLink) {
      return 'shareLink';
    } else if (enableUploadLink) {
      return 'uploadLink';
    } else if (itemType == 'file' || itemType == 'dir') {
      return 'internalLink';
    } else if (enableDirPrivateShare) {
      return 'shareToUser';
    }
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  }

  onAddCustomPermissionToggle = () => {
    this.toggle('customSharePermission');
  }

  renderDirContent = () => {

    if (!this.state.isRepoJudgemented) {
      return <Loading />;
    }

    let activeTab = this.state.activeTab;
    let { repoEncrypted, userPerm, enableDirPrivateShare, itemType } = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;
    const enableUploadLink = !repoEncrypted && canGenerateUploadLink && (userPerm == 'rw' || userPerm == 'admin');

    // for encrypted repo, 'dir private share' is only enabled for the repo itself,
    // not for the folders in it.
    if (repoEncrypted) {
      enableDirPrivateShare = itemType == 'library';
    }

    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            {enableShareLink &&
            <NavItem role="tab" aria-selected={activeTab === 'shareLink'} aria-controls="share-link-panel">
              <NavLink className={activeTab === 'shareLink' ? 'active' : ''} onClick={(this.toggle.bind(this, 'shareLink'))} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                {gettext('Share Link')}
              </NavLink>
            </NavItem>
            }
            {enableUploadLink &&
              <NavItem role="tab" aria-selected={activeTab === 'uploadLink'} aria-controls="upload-link-panel">
                <NavLink className={activeTab === 'uploadLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLink')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                  {gettext('Upload Link')}
                </NavLink>
              </NavItem>
            }
            {itemType === 'dir' &&
              <NavItem role="tab" aria-selected={activeTab === 'internalLink'} aria-controls="internal-link-panel">
                <NavLink className={activeTab === 'internalLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'internalLink')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                  {gettext('Internal Link')}
                </NavLink>
              </NavItem>
            }
            {enableDirPrivateShare &&
              <Fragment>
                <NavItem role="tab" aria-selected={activeTab === 'shareToUser'} aria-controls="share-to-user-panel">
                  <NavLink className={activeTab === 'shareToUser' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToUser')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                    {gettext('Share to user')}
                  </NavLink>
                </NavItem>
                <NavItem role="tab" aria-selected={activeTab === 'shareToGroup'} aria-controls="share-to-group-panel">
                  <NavLink className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToGroup')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                    {gettext('Share to group')}
                  </NavLink>
                </NavItem>
                {isPro && !isCustomPermission && (
                  <NavItem role="tab" aria-selected={activeTab === 'customSharePermission'} aria-controls="custom-share-perm-panel">
                    <NavLink className={activeTab === 'customSharePermission' ? 'active' : ''} onClick={this.toggle.bind(this, 'customSharePermission')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('Custom sharing permissions')}
                    </NavLink>
                  </NavItem>
                )}
                {canInvitePeople &&
                <NavItem role="tab" aria-selected={activeTab === 'invitePeople'} aria-controls="invite-people-panel">
                  <NavLink className={activeTab === 'invitePeople' ? 'active' : ''} onClick={this.toggle.bind(this, 'invitePeople')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                    {gettext('Invite Guest')}
                  </NavLink>
                </NavItem>
                }
              </Fragment>
            }
            {enableOCM && itemType === 'library' && this.state.isRepoOwner &&
              <NavItem role="tab" aria-selected={activeTab === 'shareToOtherServer'} aria-controls="share-to-other-server-panel">
                <NavLink className={activeTab === 'shareToOtherServer' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToOtherServer')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                  {gettext('Share to other server')}
                </NavLink>
              </NavItem>
            }
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            {(enableShareLink && activeTab === 'shareLink') &&
              <TabPane tabId="shareLink" role="tabpanel" id="share-link-panel">
                <ShareLinkPanel
                  itemPath={this.props.itemPath}
                  repoID={this.props.repoID}
                  closeShareDialog={this.props.toggleDialog}
                  itemType={itemType}
                  userPerm={userPerm}
                />
              </TabPane>
            }
            {(enableUploadLink && activeTab === 'uploadLink') &&
              <TabPane tabId="uploadLink" role="tabpanel" id="upload-link-panel">
                <GenerateUploadLink
                  itemPath={this.props.itemPath}
                  repoID={this.props.repoID}
                  closeShareDialog={this.props.toggleDialog}
                />
              </TabPane>
            }
            {(itemType === 'dir' && activeTab === 'internalLink') &&
              <TabPane tabId="internalLink" role="tabpanel" id="internal-link-panel">
                <InternalLink
                  path={this.props.itemPath}
                  repoID={this.props.repoID}
                  direntType={itemType}
                />
              </TabPane>
            }
            {enableDirPrivateShare &&
              <Fragment>
                {activeTab === 'shareToUser' &&
                  <TabPane tabId="shareToUser" role="tabpanel" id="share-to-user-panel">
                    <ShareToUser
                      itemType={this.props.itemType}
                      isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                      itemPath={this.props.itemPath}
                      repoID={this.props.repoID}
                      isRepoOwner={this.state.isRepoOwner}
                      onAddCustomPermissionToggle={this.onAddCustomPermissionToggle}
                    />
                  </TabPane>
                }
                {activeTab === 'shareToGroup' &&
                  <TabPane tabId="shareToGroup" role="tabpanel" id="share-to-group-panel">
                    <ShareToGroup
                      itemType={this.props.itemType}
                      isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                      itemPath={this.props.itemPath}
                      repoID={this.props.repoID}
                      isRepoOwner={this.state.isRepoOwner}
                      onAddCustomPermissionToggle={this.onAddCustomPermissionToggle}
                    />
                  </TabPane>
                }
                {isPro && activeTab === 'customSharePermission' && (
                  <TabPane tabId="customSharePermission" role="tabpanel" id="custom-share-perm-panel">
                    <CustomPermissionManager repoID={this.props.repoID} />
                  </TabPane>
                )}
                {(canInvitePeople && activeTab === 'invitePeople') &&
                  <TabPane tabId="invitePeople" role="tabpanel" id="invite-people-panel">
                    <ShareToInvitePeople itemPath={this.props.itemPath} repoID={this.props.repoID} />
                  </TabPane>
                }
              </Fragment>
            }
            {enableOCM && itemType === 'library' && activeTab === 'shareToOtherServer' &&
              <TabPane tabId="shareToOtherServer" role="tabpanel" id="share-to-other-server-panel">
                <ShareToOtherServer itemType={this.props.itemType} isGroupOwnedRepo={this.props.isGroupOwnedRepo} itemPath={this.props.itemPath} repoID={this.props.repoID} isRepoOwner={this.state.isRepoOwner} />
              </TabPane>
            }
          </TabContent>
        </div>
      </Fragment>
    );
  }

  onTabKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }

  renderFileContent = () => {
    let activeTab = this.state.activeTab;
    const { itemType, itemName, repoEncrypted, userPerm } = this.props;
    const enableShareLink = !repoEncrypted && canGenerateShareLink;

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            {enableShareLink &&
            <NavItem role="tab" aria-selected={activeTab === 'shareLink'} aria-controls="share-link-panel">
              <NavLink className={activeTab === 'shareLink' ? 'active' : ''} onClick={(this.toggle.bind(this, 'shareLink'))} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                {gettext('Share Link')}
              </NavLink>
            </NavItem>
            }
            <NavItem role="tab" aria-selected={activeTab === 'internalLink'} aria-controls="internal-link-panel">
              <NavLink className={activeTab === 'internalLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'internalLink')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                {gettext('Internal Link')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            {enableShareLink && activeTab === 'shareLink' &&
              <TabPane tabId="shareLink" role="tabpanel" id="share-link-panel">
                <ShareLinkPanel
                  itemPath={this.props.itemPath}
                  repoID={this.props.repoID}
                  closeShareDialog={this.props.toggleDialog}
                  itemType={itemType}
                  userPerm={userPerm}
                />
              </TabPane>
            }
            {activeTab === 'internalLink' &&
              <TabPane tabId="internalLink" role="tabpanel" id="internal-link-panel">
                <InternalLink
                  path={this.props.itemPath}
                  repoID={this.props.repoID}
                />
              </TabPane>
            }
          </TabContent>
        </div>
      </Fragment>
    );
  }

  renderExternalShareMessage = () => {
    if (additionalShareDialogNote && (typeof additionalShareDialogNote) === 'object') {
      return (
        <div className="external-share-message mt-2">
          <h6>{additionalShareDialogNote.title}</h6>
          <div style={{fontSize: '14px', color: '#666'}}>{additionalShareDialogNote.content}</div>
        </div>
      );
    }
    return null;
  }

  render() {
    const { itemType, itemName } = this.props;
    return (
      <div>
        <Modal isOpen={true} style={{maxWidth: '760px'}} className="share-dialog" toggle={this.props.toggleDialog}>
          <ModalHeader toggle={this.props.toggleDialog}>
            {gettext('Share')} <span className="op-target" title={itemName}>{itemName}</span>
            {this.renderExternalShareMessage()}
          </ModalHeader>
          <ModalBody className="share-dialog-content" role="tablist">
            {(itemType === 'library' || itemType === 'dir') && this.renderDirContent()}
            {itemType === 'file' && this.renderFileContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

ShareDialog.propTypes = propTypes;

export default ShareDialog;

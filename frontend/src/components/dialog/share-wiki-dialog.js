import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, username, additionalShareDialogNote, canShareRepo, LARGE_DIALOG_STYLE } from '../../utils/constants';
import ShareToUser from './share-to-user';
import ShareToGroup from './share-to-group';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/share-link-dialog.css';

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemType: PropTypes.string.isRequired, // there will be three choose: ['library', 'dir', 'file']
  itemName: PropTypes.string.isRequired,
  itemPath: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool,
  enableDirPrivateShare: PropTypes.bool,
};

class ShareWikiDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'shareToUser',
      isRepoJudgemented: false,
      isRepoOwner: false,
      isGroupOwnedRepo: false,
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    seafileAPI.getRepoInfo(repoID).then(res => {
      const isGroupOwnedRepo = res.data.owner_email.indexOf('@seafile_group') > -1;
      let isRepoOwner = res.data.owner_email === username;
      this.setState({
        isRepoJudgemented: true,
        isRepoOwner: isRepoOwner,
        repoType: res.data.repo_type,
        isGroupOwnedRepo: isGroupOwnedRepo,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  };

  onAddCustomPermissionToggle = () => {
    this.toggle('customSharePermission');
  };

  renderDirContent = () => {

    if (!this.state.isRepoJudgemented) {
      return <Loading />;
    }

    let activeTab = this.state.activeTab;
    let { repoEncrypted, enableDirPrivateShare, itemType } = this.props;
    if (repoEncrypted) {
      enableDirPrivateShare = itemType == 'library';
    }
    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills>
            {enableDirPrivateShare &&
              <Fragment>
                { canShareRepo && (
                  <NavItem role="tab" aria-selected={activeTab === 'shareToUser'} aria-controls="share-to-user-panel">
                    <NavLink className={activeTab === 'shareToUser' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToUser')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('Share to user')}
                    </NavLink>
                  </NavItem>
                )}
                { canShareRepo && (
                  <NavItem role="tab" aria-selected={activeTab === 'shareToGroup'} aria-controls="share-to-group-panel">
                    <NavLink className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToGroup')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('Share to group')}
                    </NavLink>
                  </NavItem>
                )}
              </Fragment>
            }
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            {enableDirPrivateShare &&
              <Fragment>
                {(activeTab === 'shareToUser' && canShareRepo) &&
                  <TabPane tabId="shareToUser" role="tabpanel" id="share-to-user-panel">
                    <ShareToUser
                      itemType={this.props.itemType}
                      isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                      itemPath={this.props.itemPath}
                      repoID={this.props.repoID}
                      isRepoOwner={this.state.isRepoOwner}
                      repoType={this.state.repoType}
                      onAddCustomPermissionToggle={this.onAddCustomPermissionToggle}
                    />
                  </TabPane>
                }
                {(activeTab === 'shareToGroup' && canShareRepo) &&
                  <TabPane tabId="shareToGroup" role="tabpanel" id="share-to-group-panel">
                    <ShareToGroup
                      itemType={this.props.itemType}
                      isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                      itemPath={this.props.itemPath}
                      repoID={this.props.repoID}
                      isRepoOwner={this.state.isRepoOwner}
                      repoType={this.state.repoType}
                      onAddCustomPermissionToggle={this.onAddCustomPermissionToggle}
                    />
                  </TabPane>
                }
              </Fragment>
            }
          </TabContent>
        </div>
      </Fragment>
    );
  };

  onTabKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  };

  renderExternalShareMessage = () => {
    if (additionalShareDialogNote && (typeof additionalShareDialogNote) === 'object') {
      return (
        <div className="external-share-message mt-2">
          <h6>{additionalShareDialogNote.title}</h6>
          <p style={{ fontSize: '14px', color: '#666' }} className="text-wrap m-0">{additionalShareDialogNote.content}</p>
        </div>
      );
    }
    return null;
  };

  render() {
    const { itemType, itemName } = this.props;
    return (
      <div>
        <Modal isOpen={true} style={LARGE_DIALOG_STYLE} className="share-dialog" toggle={this.props.toggleDialog}>
          <SeahubModalHeader toggle={this.props.toggleDialog} tag="div">
            <h5 className="text-truncate">{gettext('Share')} <span className="op-target" title={itemName}>{itemName}</span></h5>
            {this.renderExternalShareMessage()}
          </SeahubModalHeader>
          <ModalBody className="share-dialog-content" role="tablist">
            {(itemType === 'library') && this.renderDirContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

ShareWikiDialog.propTypes = propTypes;

export default ShareWikiDialog;

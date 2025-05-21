import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { gettext, canGenerateShareLink, canGenerateUploadLink, LARGE_DIALOG_STYLE } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import RepoShareAdminShareLinks from './repo-share-admin/share-links';
import RepoShareAdminUploadLinks from './repo-share-admin/upload-links';
import RepoShareAdminUserShares from './repo-share-admin/user-shares';
import RepoShareAdminGroupShares from './repo-share-admin/group-shares';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/repo-share-admin.css';

const propTypes = {
  repo: PropTypes.object.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class RepoShareAdminDialog extends React.Component {

  constructor(props) {
    super(props);
    this.enableShareLink = !this.props.repo.encrypted && canGenerateShareLink;
    this.enableUploadLink = !this.props.repo.encrypted && canGenerateUploadLink;
    this.state = {
      activeTab: this.getInitialActiveTab()
    };
  }

  getInitialActiveTab = () => {
    if (this.enableShareLink) {
      return 'shareLink';
    } else if (this.enableUploadLink) {
      return 'uploadLink';
    } else {
      return 'shareToUser';
    }
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  };

  onTabKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  };

  render() {
    const { activeTab } = this.state;
    const { repo_name: repoName } = this.props.repo;
    let title = gettext('{placeholder} Share Admin');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <div>
        <Modal isOpen={true} className="repo-share-admin-container share-dialog" style={LARGE_DIALOG_STYLE } toggle={this.props.toggleDialog}>
          <SeahubModalHeader toggle={this.props.toggleDialog}>
            <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
          </SeahubModalHeader>
          <ModalBody className="repo-share-admin-content-container share-dialog-content" role="tablist">
            <Fragment>
              <div className="share-dialog-side">
                <Nav pills>
                  {this.enableShareLink &&
                  <NavItem role="tab" aria-selected={activeTab === 'shareLink'} aria-controls="share-link-panel">
                    <NavLink className={activeTab === 'shareLink' ? 'active' : ''} onClick={(this.toggle.bind(this, 'shareLink'))} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('Share Links')}
                    </NavLink>
                  </NavItem>
                  }
                  {this.enableUploadLink &&
                    <NavItem role="tab" aria-selected={activeTab === 'uploadLink'} aria-controls="upload-link-panel">
                      <NavLink className={activeTab === 'uploadLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLink')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                        {gettext('Upload Links')}
                      </NavLink>
                    </NavItem>
                  }
                  <NavItem role="tab" aria-selected={activeTab === 'shareToUser'} aria-controls="share-to-user-panel">
                    <NavLink className={activeTab === 'shareToUser' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToUser')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('User Shares')}
                    </NavLink>
                  </NavItem>
                  <NavItem role="tab" aria-selected={activeTab === 'shareToGroup'} aria-controls="share-to-group-panel">
                    <NavLink className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToGroup')} tabIndex="0" onKeyDown={this.onTabKeyDown}>
                      {gettext('Group Shares')}
                    </NavLink>
                  </NavItem>
                </Nav>
              </div>
              <div className="share-dialog-main">
                <TabContent activeTab={this.state.activeTab}>
                  {(this.enableShareLink && activeTab === 'shareLink') &&
                    <TabPane tabId="shareLink" role="tabpanel" id="share-link-panel">
                      <RepoShareAdminShareLinks
                        repo={this.props.repo}
                      />
                    </TabPane>
                  }
                  {(this.enableUploadLink && activeTab === 'uploadLink') &&
                    <TabPane tabId="uploadLink" role="tabpanel" id="upload-link-panel">
                      <RepoShareAdminUploadLinks
                        repo={this.props.repo}
                      />
                    </TabPane>
                  }
                  {activeTab === 'shareToUser' &&
                    <TabPane tabId="shareToUser" role="tabpanel" id="share-to-user-panel">
                      <RepoShareAdminUserShares
                        repo={this.props.repo}
                      />
                    </TabPane>
                  }
                  {activeTab === 'shareToGroup' &&
                    <TabPane tabId="shareToGroup" role="tabpanel" id="share-to-group-panel">
                      <RepoShareAdminGroupShares
                        repo={this.props.repo}
                      />
                    </TabPane>
                  }
                </TabContent>
              </div>
            </Fragment>
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

RepoShareAdminDialog.propTypes = propTypes;

export default RepoShareAdminDialog;

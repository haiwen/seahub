import React, { Fragment }  from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import ShareWorkspaceToUser from './share-workspace-to-user';

import '../../css/share-link-dialog.css';

const propTypes = {
  currentWorkspace: PropTypes.object.isRequired,
  userShareCancel: PropTypes.func.isRequired,
};

class ShareWorkspaceDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'shareToUser',
    };
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
  };

  renderContent = () => {
    let activeTab = this.state.activeTab;

    return (
      <Fragment>
        <div className="share-dialog-side">
          <Nav pills vertical>
            <Fragment>
              <NavItem>
                <NavLink
                  className={activeTab === 'shareToUser' ? 'active' : ''}
                  onClick={this.toggle.bind(this, 'shareToUser')}
                >{gettext('Share to user')}
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  className={activeTab === 'shareToGroup' ? 'active' : ''}
                  onClick={this.toggle.bind(this, 'shareToGroup')}
                >{gettext('Share to group')}
                </NavLink>
              </NavItem>
            </Fragment>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <Fragment>
              <TabPane tabId="shareToUser">
                <ShareWorkspaceToUser
                  currentWorkspace={this.props.currentWorkspace}
                />
              </TabPane>
              <TabPane tabId="shareToGroup">

              </TabPane>
            </Fragment>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    let currentWorkspace = this.props.currentWorkspace;
    let name = currentWorkspace.name;

    return (
      <Modal isOpen={true} toggle={this.props.userShareCancel} style={{maxWidth: '720px'}} className="share-dialog" >
        <ModalHeader toggle={this.props.userShareCancel}>{gettext('Share')} <span className="op-target" title={name}>{name}</span></ModalHeader>
        <ModalBody className="share-dialog-content">
          {this.renderContent()}
        </ModalBody>
      </Modal>
    );
  }
}

ShareWorkspaceDialog.propTypes = propTypes;

export default ShareWorkspaceDialog;

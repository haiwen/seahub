import React, { Fragment }  from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import ShareTableToUser from './share-table-to-user';

import '../../css/share-link-dialog.css';
import GenerateDTableShareLink from './generate-dtable-share-link';

const propTypes = {
  currentTable: PropTypes.object.isRequired,
  ShareCancel: PropTypes.func.isRequired,
};

class ShareTableDialog extends React.Component {
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
                  className={activeTab === 'shareLink' ? 'active' : ''}
                  onClick={this.toggle.bind(this, 'shareLink')}
                >{gettext('Share link')}
                </NavLink>
              </NavItem>
            </Fragment>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <Fragment>
              <TabPane tabId="shareToUser">
                <ShareTableToUser
                  currentTable={this.props.currentTable}
                />
              </TabPane>
              {activeTab === 'shareLink' &&
                <GenerateDTableShareLink
                  workspaceID={this.props.currentTable.workspace_id}
                  name={this.props.currentTable.name}
                  closeShareDialog={this.props.ShareCancel}
                />
              }
            </Fragment>
          </TabContent>
        </div>
      </Fragment>
    );
  };

  render() {
    let currentTable = this.props.currentTable;
    let name = currentTable.name;

    return (
      <Modal isOpen={true} toggle={this.props.ShareCancel} style={{maxWidth: '720px'}} className="share-dialog" >
        <ModalHeader toggle={this.props.ShareCancel}>{gettext('Share')} <span className="op-target" title={name}>{name}</span></ModalHeader>
        <ModalBody className="share-dialog-content">
          {this.renderContent()}
        </ModalBody>
      </Modal>
    );
  }
}

ShareTableDialog.propTypes = propTypes;

export default ShareTableDialog;

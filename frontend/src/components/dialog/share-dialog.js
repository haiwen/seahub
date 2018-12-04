import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, TabContent, TabPane, Nav, NavItem, NavLink, Row, Col } from 'reactstrap'; 
import { gettext } from '../../utils/constants';
import ShareToUser from './share-to-user';
import ShareToGroup from './share-to-group';
import GenerateShareLink from './generate-share-link';
import GenerateUploadLink from './generate-upload-link';
import '../../css/share-link-dialog.css';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isDir: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired
};

class ShareDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'shareLink'
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
          <Nav>
            <NavItem>
              <NavLink className={activeTab === "shareLink" ? 'active' : ''} onClick={this.toggle.bind(this, 'shareLink')}>
                {gettext("Share Link")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={activeTab === 'uploadLink' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLink')}>
                {gettext("Upload Link")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={activeTab === 'shareToUser' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToUser')}>
                {gettext("Share to user")}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareToGroup')}>
                {gettext("Share to group")}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="shareLink">
              <GenerateShareLink itemPath={this.props.itemPath} repoID={this.props.repoID} />
            </TabPane>
            <TabPane tabId="uploadLink">
              <GenerateUploadLink itemPath={this.props.itemPath} repoID={this.props.repoID} />
            </TabPane>
            <TabPane tabId="shareToUser">
              <ShareToUser itemPath={this.props.itemPath} repoID={this.props.repoID} />
            </TabPane>
            <TabPane tabId="shareToGroup">
              <ShareToGroup itemPath={this.props.itemPath} repoID={this.props.repoID} />
            </TabPane>
          </TabContent>
        </div>
      </Fragment>
    );
  }

  renderFileContent = () => {
    let activeTab = this.state.activeTab;
    return (
      <Row>
        <Col sm='3'>
          <Nav>
            <NavItem>
              <NavLink
                className={activeTab === 'shareToGroup' ? 'active' : ''} onClick={() => { this.toggle.bind(this, 'shareLink')}}>
                {gettext("Share Link")}
              </NavLink>
            </NavItem>
          </Nav>
        </Col>
        <Col sm='9'>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="shareLink">
              <GenerateShareLink itemPath={this.props.itemPath} repoID={this.props.repoID} />
            </TabPane>
          </TabContent>
        </Col>
      </Row>
    );
  }

  render() {
    let itemName = this.props.itemName;
    
    return (
      <div>
        <Modal isOpen={this.props.isOpen} style={{maxWidth: '720px'}} className="share-dialog">
          <ModalHeader toggle={this.props.toggleDialog}>Share <span className="sf-font" title={itemName}>{itemName}</span></ModalHeader>
          <ModalBody className="share-dialog-content">
            {this.props.isDir && this.renderDirContent()}
            {!this.props.isDir && this.renderFileContent()}
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

ShareDialog.defaultProps = {
  isDir: false,
  isOpen: false,
};

ShareDialog.propTypes = propTypes;

export default ShareDialog;

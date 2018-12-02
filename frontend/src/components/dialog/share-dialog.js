import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, TabContent, TabPane, Nav, NavItem, NavLink, Button, Row, Col} from 'reactstrap'; 
import classnames from 'classnames';
import PropTypes from 'prop-types';
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

    this.toggle = this.toggle.bind(this);
    this.state = {
      activeTab: 'shareLink'
    };
  }

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
    }
  }

  render() {
    
    return (
      <div>
        <Modal isOpen={this.props.isOpen} style={{ 'maxWidth': '890px' }} >
          <ModalHeader toggle={this.props.toggleDialog}>
            Share <span className="op-target" title={this.props.itemName}>{this.props.itemName}</span>
          </ModalHeader>
          <ModalBody>
            <Row>
              <Col sm='2'>
              {this.props.isDir ? 
                <Nav style={{'marginLeft': '-5px'}}>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'shareLink' })}
                      onClick={() => { this.toggle('shareLink'); }}
                    >
                      {gettext("Share Link")}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'uploadLink' })}
                      onClick={() => { this.toggle('uploadLink'); }}
                    >
                      {gettext("Upload Link")}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'shareToUser' })}
                      onClick={() => { this.toggle('shareToUser'); }}
                    >
                      {gettext("Share to user")}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'shareToGroup' })}
                      onClick={() => { this.toggle('shareToGroup'); }}
                    >
                      {gettext("Share to group")}
                    </NavLink>
                  </NavItem>
                </Nav>
                :
                <Nav style={{'marginLeft': '-5px'}}>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'shareLink' })}
                      onClick={() => { this.toggle('shareLink'); }}
                    >
                      {gettext("Share Link")}
                    </NavLink>
                  </NavItem>
                </Nav>
              }
              </Col>
              <Col sm='10'>
              {this.props.isDir ?
                <TabContent activeTab={this.state.activeTab}>
                  <TabPane tabId="shareLink">
                    <GenerateShareLink  itemPath={this.props.itemPath}
                                        repoID={this.props.repoID} />
                  </TabPane>
                  <TabPane tabId="uploadLink">
                    <GenerateUploadLink itemPath={this.props.itemPath}
                                        repoID={this.props.repoID} />
                  </TabPane>
                  <TabPane tabId="shareToUser">
                    <ShareToUser itemPath={this.props.itemPath}
                                 repoID={this.props.repoID} />
                  </TabPane>
                  <TabPane tabId="shareToGroup">
                    <ShareToGroup itemPath={this.props.itemPath}
                                  repoID={this.props.repoID} />
                  </TabPane>
                </TabContent>
                :
                <TabContent activeTab={this.state.activeTab}>
                  <TabPane tabId="shareLink">
                    <GenerateShareLink  itemPath={this.props.itemPath}
                                        repoID={this.props.repoID} />
                  </TabPane>
                </TabContent>
                }
              </Col>
            </Row>
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

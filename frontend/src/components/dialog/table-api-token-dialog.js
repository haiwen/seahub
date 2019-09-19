import React, { Fragment }  from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Nav, NavItem, NavLink, TabContent, TabPane} from 'reactstrap';
import ShareTableToUser from './share-table-to-user';

import '../../css/share-link-dialog.css';

const propTypes = {
  currentTable: PropTypes.object.isRequired,
  TableAPITokenShowCancel: PropTypes.func.isRequired,
};

class TableAPITokenDialog extends React.Component {
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
    return (
      <Fragment>
        <div className="share-dialog-main">
          <TabContent activeTab={this.state.activeTab}>
            <Fragment>
              <TabPane tabId="shareToUser">
                <ShareTableToUser
                  currentTable={this.props.currentTable}
                />
              </TabPane>
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
      <Modal isOpen={true} toggle={this.props.TableAPITokenShowCancel} style={{maxWidth: '720px'}} className="share-dialog" >
        <ModalHeader toggle={this.props.TableAPITokenShowCancel}>{gettext('API Token')} <span className="op-target" title={name}>{name}</span></ModalHeader>
        <ModalBody className="share-dialog-content">
          {this.renderContent()}
        </ModalBody>
      </Modal>
    );
  }
}

TableAPITokenDialog.propTypes = propTypes;

export default TableAPITokenDialog;

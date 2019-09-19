import React, { Fragment }  from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Button, Input} from 'reactstrap';
import DtableSharePermissionEditor from '../select-editor/dtable-share-permission-editor';
import {seafileAPI} from '../../utils/seafile-api';
import toaster from '../toast';
import copy from 'copy-to-clipboard';

import '../../css/share-link-dialog.css';



const apiTokenItemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteAPIToken: PropTypes.func.isRequired,
  updateAPIToken: PropTypes.func.isRequired,
};

class APITokenItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  };

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  };

  deleteAPIToken = () => {
    this.props.deleteAPIToken(this.props.item.api_token);
  };

  updateAPIToken = (permission) => {
    this.props.updateAPIToken(this.props.item.api_token, permission);
  };

  onCopyAPIToken = () => {
    let api_token = this.props.item.api_token;
    copy(api_token);
    toaster.success(gettext('API Token is copied to the clipboard.'));
  };

  render() {
    let item = this.props.item;
    let currentPermission = item.permission;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">{item.app_name}</td>
        <td>
          <DtableSharePermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            onPermissionChanged={this.updateAPIToken}
          />
        </td>
        <td>{item.api_token}</td>
        <td>
          <span
            className="far fa-copy action-icon"
            onClick={this.onCopyAPIToken}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteAPIToken}
            title={gettext('Delete')}
          />
        </td>
      </tr>
    );
  }
}

APITokenItem.propTypes = apiTokenItemPropTypes;

const propTypes = {
  currentTable: PropTypes.object.isRequired,
  TableAPITokenShowCancel: PropTypes.func.isRequired,
};

class TableAPITokenDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      apiTokenList: [],
    };
    this.workspaceID = this.props.currentTable.workspace_id;
    this.tableName = this.props.currentTable.name;
  }

  listAPITokens = () => {
    seafileAPI.listTableAPITokens(this.workspaceID, this.tableName).then((res) => {
      this.setState({
        apiTokenList: res.data.api_tokens,
      });
    }).catch(error => {
      if (error.status === 403) {
        toaster.danger(gettext('Permission denied'), {duration: 3});
      } else {
        this.handleError(error);
      }
    });
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
    }
  };

  componentDidMount () {
    this.listAPITokens();
  }

  renderContent = () => {
    const renderAPITokenList = this.state.apiTokenList.map((item, index) => {
      return (
        <APITokenItem
          key={index}
          item={item}
          permissions={['rw', 'r']}
          deleteAPIToken={this.deleteAPIToken}
          updateAPIToken={this.updateAPIToken}
        />
      );
    });

    return (
      <div className='h-100 mx-5'>
        <table>
          <thead>
            <tr>
              <th width="45%">{gettext('App Name')}</th>
              <th width="40%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Input
                />
              </td>
              <td>
                <DtableSharePermissionEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  onPermissionChanged={this.setPermission}
                />
              </td>
              <td>
                <Button onClick={this.addTableShare}>{gettext('Submit')}</Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="share-list-container">
          <table>
            {this.state.apiTokenList.length !== 0 &&
            <thead>
              <tr>
                <th width="25%">{gettext('App Name')}</th>
                <th width="15%">{gettext('Permission')}</th>
                <th width="50%">{gettext('Access Token')}</th>
                <th width="5%"></th>
                <th width="5%"></th>
              </tr>
            </thead>
            }
            <tbody>
              {renderAPITokenList}
            </tbody>
          </table>
        </div>
      </div>
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

import React, { Fragment } from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import { gettext, ocmRemoteServers } from '../../utils/constants';
import { Input } from 'reactstrap';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import OpIcon from '../op-icon';
import SharePermissionEditor from '../select-editor/share-permission-editor';

class ShareItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      isOpFrozen: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  }

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  }

  deleteShareItem = () => {
    this.setState({
      // the 'delete' takes time,
      // so 'lock' the op icon here to avoid multiple click on it
      // avoid repeated requests
      isOpFrozen: true
    });
    let item = this.props.item;
    this.props.deleteShareItem(item);
  }

  render() {
    let item = this.props.item;
    const { isOperationShow, isOpFrozen } = this.state;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td><a href={item.to_server_url} target="_blank">{item.to_server_name}</a></td>
        <td>{item.to_user}</td>
        <td>{Utils.sharePerms(item.permission)}</td>
        {/* <td>
          <SharePermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
          />
        </td> */}
        <td>
          <OpIcon
            className={`sf2-icon-x3 action-icon ${isOperationShow && !isOpFrozen ? '' : 'hide'}`}
            op={this.deleteShareItem}
            title={gettext('Delete')}
          />
        </td>
      </tr>
    );
  }
}

class ShareList extends React.Component {

  render() {
    return (
      <div className="share-list-container">
        <table className="table-thead-hidden">
          <thead>
            <tr>
              <th width="30%">{gettext('Server')}</th>
              <th width="25%">{gettext('User Email')}</th>
              <th width="30%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            {this.props.items.map((item, index) => {
              return (
                <ShareItem
                  key={index}
                  item={item}
                  deleteShareItem={this.props.deleteShareItem}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
};

class ShareToOtherServer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedServer: null,
      toUser: '',
      permission: 'rw',
      btnDisabled: true,
      isSubmitting: false,
      ocmShares: []
    };
    this.permissions = ['rw', 'r'];
  }

  componentDidMount() {
    seafileAPI.listOCMSharesPrepare(this.props.repoID).then((res) => {
      this.setState({ocmShares: res.data.ocm_share_list});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({
        errorMsg: errMessage
      });
    });
  }

  OCMShare = () => {
    const { repoID, itemPath } = this.props;
    const { selectedServer, toUser, permission } = this.state;
    let toServerURL = selectedServer.value;
    if (!toServerURL.endsWith('/')) {
      toServerURL += '/';
    }
    this.setState({
      btnDisabled: true,
      isSubmitting: true
    });
    seafileAPI.addOCMSharePrepare(toUser, toServerURL, repoID, itemPath, permission).then((res) => {
      let ocmShares = this.state.ocmShares;
      ocmShares.unshift(res.data);
      this.setState({
        ocmShares: ocmShares,
        selectedServer: null,
        toUser: '',
        permission: 'rw',
        isSubmitting: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({
        btnDisabled: false,
        isSubmitting: false
      });
    });
  }

  handleToUserChange = (e) => {
    const toUser = e.target.value;
    this.setState({
      toUser: toUser,
      btnDisabled: !this.state.selectedServer || !toUser.trim()
    });
  }

  handleServerChange = (selectedServer) => {
    this.setState({
      selectedServer,
      btnDisabled: !this.state.toUser.trim()
    });
  }

  deleteShareItem = (deletedItem) => {
    const { id } = deletedItem;
    toaster.notify(gettext('It may take some time, please wait.'));
    seafileAPI.deleteOCMSharePrepare(id).then((res) => {
      let ocmShares = this.state.ocmShares.filter(item => {
        return item.id != id;
      });
      this.setState({ocmShares: ocmShares});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  render() {
    const {
      errorMsg, ocmShares,
      toUser, selectedServer, permission,
      btnDisabled, isSubmitting
    } = this.state;
    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="30%">{gettext('Server')}</th>
              <th width="25%">{gettext('User Email')}</th>
              <th width="30%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Select
                  placeholder={gettext('Select a server...')}
                  value={selectedServer}
                  options={ocmRemoteServers}
                  onChange={this.handleServerChange}
                />
              </td>
              <td>
                <Input
                  value={toUser}
                  onChange={this.handleToUserChange}
                />
              </td>
              <td>
                <SharePermissionEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                />
              </td>
              <td>
                <Button
                  onClick={this.OCMShare}
                  disabled={btnDisabled}
                  className={isSubmitting ? 'btn-loading' : ''}>
                  {gettext('Submit')}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        {errorMsg ?
          <p className="error text-center mt-4">{errorMsg}</p> :
          <ShareList
            items={ocmShares}
            deleteShareItem={this.deleteShareItem}
          />
        }
      </Fragment>
    );
  }
}

ShareToOtherServer.propTypes = propTypes;

export default ShareToOtherServer;

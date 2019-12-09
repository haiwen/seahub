import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Input } from 'reactstrap';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SharePermissionEditor from '../select-editor/share-permission-editor';

class ShareItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }
  
  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  }

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  }

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item);
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{item.to_sever_url}</td>
        <td className="name">{item.to_user}</td>
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
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareItem}
            title={gettext('Delete')}
          >
          </span>
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
              <th width="40%">{gettext('Server URL')}</th>
              <th width="25%">{gettext('User Email')}</th>
              <th width="20%">{gettext('Permission')}</th>
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
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      ocmShares: [],
      toUser: '',
      toServerURL: '',
    };
    this.options = [];
    this.permissions = ['rw', 'r'];
    this.UnshareMessage = 'File was unshared';

  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
    this.options = [];
  }

  componentDidMount() {
    seafileAPI.listOCMSharesPrepare(this.props.repoID).then((res) => {
      this.setState({ocmShares: res.data.ocm_share_list});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  startOCMShare = () => {
    let { repoID, itemPath } = this.props;
    let { toServerURL, toUser, permission } = this.state;
    if (!toServerURL.endsWith('/')) {
      toServerURL += '/';
    }
    seafileAPI.addOCMSharePrepare(toUser, toServerURL, repoID, itemPath, permission).then((res) => {
      toaster.success(gettext('share success.'));
      let ocmShares = this.state.ocmShares;
      ocmShares.push(res.data);
      this.setState({ocmShares: ocmShares});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleToUserChange = (e) => {
    this.setState({
      toUser: e.target.value,
    });
  }

  handleURLChange = (e) => {
    this.setState({
      toServerURL: e.target.value,
    });
  }

  deleteShareItem = (deletedItem) => {
    let { id } = deletedItem;
    seafileAPI.deleteOCMSharePrepare(id).then((res) => {
      toaster.success(gettext('delete success.'));
      let ocmShares = this.state.ocmShares.filter(item => {
        return item.id != id;
      });
      this.setState({ocmShares: ocmShares});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }


  render() {
    let { ocmShares, toUser, toServerURL, permission } = this.state;
    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="40%">{gettext('Server URL')}</th>
              <th width="25%">{gettext('User Email')}</th>
              <th width="20%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Input
                  value={toServerURL}
                  onChange={this.handleURLChange}
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
                <Button onClick={this.startOCMShare}>{gettext('Submit')}</Button>
              </td>
            </tr>
          </tbody>
        </table>
        <ShareList
          items={ocmShares}
          deleteShareItem={this.deleteShareItem} 
        />
      </Fragment>
    );
  }
}

ShareToOtherServer.propTypes = propTypes;

export default ShareToOtherServer;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext, isPro, enableShareToDepartment } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import { SeahubSelect, NoGroupMessage } from '../common/select';

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({ isOperationShow: true });
  };

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  };

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item.group_info.id);
  };

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
        <td className='name'>{item.group_info.name}</td>
        <td>
          <SharePermissionEditor
            repoID={this.props.repoID}
            isTextMode={true}
            autoFocus={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
          />
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareItem}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

GroupItem.propTypes = {
  repoID: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareItem: PropTypes.func.isRequired,
  onChangeUserPermission: PropTypes.func.isRequired,
};

class GroupList extends React.Component {

  render() {
    let items = this.props.items;
    return (
      <tbody>
        {items.map((item, index) => {
          return (
            <GroupItem
              key={index}
              item={item}
              repoID={this.props.repoID}
              permissions={this.props.permissions}
              deleteShareItem={this.props.deleteShareItem}
              onChangeUserPermission={this.props.onChangeUserPermission}
            />
          );
        })}
      </tbody>
    );
  }
}

GroupList.propTypes = {
  repoID: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteShareItem: PropTypes.func.isRequired,
  onChangeUserPermission: PropTypes.func.isRequired,
};

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoType: PropTypes.string,
  isRepoOwner: PropTypes.bool.isRequired,
  onAddCustomPermissionToggle: PropTypes.func,
};

class ShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      sharedItems: [],
      isWiki: this.props.repoType === 'wiki'
    };
    this.permissions = [];
    let { itemType, isRepoOwner } = props;
    if (itemType === 'library') {
      this.permissions = isRepoOwner ? ['rw', 'r', 'admin', 'cloud-edit', 'preview'] : ['rw', 'r', 'cloud-edit', 'preview'];
    } else if (itemType === 'dir') {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
    if (!isPro) {
      this.permissions = ['rw', 'r'];
    }
    if (this.props.isGroupOwnedRepo) {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
    if (this.state.isWiki) {
      this.permissions = ['rw', 'r'];
    }
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  componentDidMount() {
    this.loadOptions();
    this.listSharedGroups();
  }

  loadOptions = () => {
    seafileAPI.shareableGroups().then((res) => {
      let options = [];
      for (let i = 0 ; i < res.data.length; i++) {
        const item = res.data[i];
        if (item.parent_group_id != 0) { // it's a department
          if (!enableShareToDepartment) {
            continue;
          }
        }
        let obj = {};
        obj.value = res.data[i].name;
        obj.id = res.data[i].id;
        obj.label = res.data[i].name;
        options.push(obj);
      }
      this.setState({ options: options });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listSharedGroups = () => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.listSharedItems(repoID, path, 'group').then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          sharedItems: res.data
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  shareToGroup = () => {

    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let isGroupOwnedRepo = this.props.isGroupOwnedRepo;

    if (isGroupOwnedRepo) {
      seafileAPI.shareGroupOwnedRepoToGroup(repoID, this.state.permission, this.state.selectedOption['id'], path).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }

        // todo modify api
        let items = res.data.success.map(item => {
          let sharedItem = {
            'group_info': { 'id': item.group_id, 'name': item.group_name },
            'permission': item.permission,
            'share_type': 'group',
          };
          return sharedItem;
        });

        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(items),
          selectedOption: null,
          permission: 'rw',
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.shareFolder(repoID, path, 'group', this.state.permission, [this.state.selectedOption['id']]).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }

        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(res.data.success),
          selectedOption: null,
          permission: 'rw'
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  deleteShareItem = (groupID) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.deleteGroupOwnedRepoSharedGroupItem(repoID, groupID, path).then(() => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.deleteShareToGroupItem(repoID, path, 'group', groupID).then(() => {
        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  onChangeUserPermission = (item, permission) => {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    let groupID = item.group_info.id;
    if (this.props.isGroupOwnedRepo) {
      seafileAPI.modifyGroupOwnedRepoGroupSharedPermission(repoID, permission, groupID, path).then(() => {
        this.updateSharedItems(item, permission);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.updateShareToGroupItemPermission(repoID, path, 'group', groupID, permission).then(() => {
        this.updateSharedItems(item, permission);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  updateSharedItems = (item, permission) => {
    let groupID = item.group_info.id;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemGroupID = sharedItem.group_info.id;
      if (groupID === sharedItemGroupID) {
        sharedItem.permission = permission;
        sharedItem.is_admin = permission === 'admin' ? true : false;
      }
      return sharedItem;
    });
    this.setState({ sharedItems: sharedItems });
  };

  render() {
    const thead = (
      <thead>
        <tr>
          <th width="47%">{gettext('Group')}</th>
          <th width="35%">{gettext('Permission')}</th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    return (
      <Fragment>
        <table className="w-xs-200">
          {thead}
          <tbody>
            <tr>
              <td>
                <SeahubSelect
                  onChange={this.handleSelectChange}
                  options={this.state.options}
                  placeholder={gettext('Select groups')}
                  maxMenuHeight={200}
                  value={this.state.selectedOption}
                  components={{ NoOptionsMessage: NoGroupMessage }}
                />
              </td>
              <td>
                <SharePermissionEditor
                  repoID={this.props.repoID}
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                  enableAddCustomPermission={isPro}
                  isWiki={this.state.isWiki}
                  onAddCustomPermissionToggle={this.props.onAddCustomPermissionToggle}
                />
              </td>
              <td>
                <Button color="primary" onClick={this.shareToGroup}>{gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&
              this.state.errorMsg.map((item, index) => {
                let errMessage = item.group_name + ': ' + item.error_msg;
                return (
                  <tr key={index}>
                    <td colSpan={3}><p className="error">{errMessage}</p></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
        <div className="share-list-container">
          <table className="table-thead-hidden w-xs-200">
            {thead}
            <GroupList
              repoID={this.props.repoID}
              items={this.state.sharedItems}
              permissions={this.permissions}
              deleteShareItem={this.deleteShareItem}
              onChangeUserPermission={this.onChangeUserPermission}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

ShareToGroup.propTypes = propTypes;

export default ShareToGroup;

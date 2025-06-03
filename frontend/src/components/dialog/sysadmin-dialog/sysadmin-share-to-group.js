import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { isPro, gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import EmptyTip from '../../../components/empty-tip';
import SharePermissionEditor from '../../select-editor/share-permission-editor';
import GroupSelect from '../../common/group-select';
import Loading from '../../../components/loading';

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
    this.props.deleteShareItem(item.group_id);
  };

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  };

  render() {
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className='name'>{item.group_name}</td>
        <td>
          <SharePermissionEditor
            repoID={item.repo_id}
            isTextMode={true}
            autoFocus={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
            isSysAdmin={true}
          />
        </td>
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

GroupItem.propTypes = {
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
  isRepoOwner: PropTypes.bool.isRequired,
};

class SysAdminShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOptions: [],
      errorMsg: [],
      permission: 'rw',
      sharedItems: [],
      isLoading: true
    };
    this.options = [];
    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions.push('admin', 'cloud-edit', 'preview');
    }
  }

  componentDidMount() {
    this.loadOptions();
    this.listSharedGroups();
  }

  loadOptions = () => {
    seafileAPI.shareableGroups().then((res) => {
      this.options = [];
      for (let i = 0 ; i < res.data.length; i++) {
        let obj = {};
        obj.name = res.data[i].name;
        obj.value = res.data[i].name;
        obj.id = res.data[i].id;
        obj.label = res.data[i].name;
        this.options.push(obj);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onSelectOption = (option) => {
    const selectedOptions = this.state.selectedOptions.slice(0);
    const index = selectedOptions.findIndex(item => item.id === option.id);
    if (index > -1) {
      selectedOptions.splice(index, 1);
    } else {
      selectedOptions.push(option);
    }
    this.setState({ selectedOptions: selectedOptions });
  };

  onDeleteOption = (option) => {
    const selectedOptions = this.state.selectedOptions.slice(0);
    const index = selectedOptions.findIndex(item => item.id === option.id);
    if (index > -1) {
      selectedOptions.splice(index, 1);
    }
    this.setState({ selectedOptions: selectedOptions });
  };

  listSharedGroups = () => {
    let repoID = this.props.repoID;
    systemAdminAPI.sysAdminListRepoSharedItems(repoID, 'group').then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          sharedItems: res.data,
          isLoading: false
        });
      } else {
        this.setState({ isLoading: false });
      }
    }).catch(error => {
      this.setState({ isLoading: false });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  shareToGroup = () => {
    let repoID = this.props.repoID;
    let { selectedOptions } = this.state;
    if (selectedOptions.length === 0) return;
    let targetGroupIDs = selectedOptions.map(item => { return item.id; });
    systemAdminAPI.sysAdminAddRepoSharedItem(repoID, 'group', targetGroupIDs, this.state.permission).then(res => {
      let errorMsg = [];
      if (res.data.failed.length > 0) {
        for (let i = 0 ; i < res.data.failed.length ; i++) {
          errorMsg[i] = res.data.failed[i];
        }
      }
      let items = res.data.success;
      this.setState({
        errorMsg: errorMsg,
        sharedItems: this.state.sharedItems.concat(items),
        selectedOptions: [],
        permission: 'rw',
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteShareItem = (groupID) => {
    let repoID = this.props.repoID;
    systemAdminAPI.sysAdminDeleteRepoSharedItem(repoID, 'group', groupID).then(() => {
      this.setState({
        sharedItems: this.state.sharedItems.filter(item => { return item.group_id !== groupID; })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onChangeUserPermission = (item, permission) => {
    let repoID = this.props.repoID;
    let groupID = item.group_id;
    systemAdminAPI.sysAdminUpdateRepoSharedItemPermission(repoID, 'group', groupID, permission).then(() => {
      this.updateSharedItems(item, permission);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateSharedItems = (item, permission) => {
    let groupID = item.group_id;
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      let sharedItemGroupID = sharedItem.group_id;
      if (groupID === sharedItemGroupID) {
        sharedItem.permission = permission;
        sharedItem.is_admin = permission === 'admin' ? true : false;
      }
      return sharedItem;
    });
    this.setState({ sharedItems: sharedItems });
  };

  render() {
    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="50%">{gettext('Group')}</th>
              <th width="35%">{gettext('Permission')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <GroupSelect
                  selectedOptions={this.state.selectedOptions}
                  options={this.options}
                  onSelectOption={this.onSelectOption}
                  onDeleteOption={this.onDeleteOption}
                  searchPlaceholder={gettext('Search groups')}
                  noOptionsPlaceholder={gettext('No results')}
                  isInModal={true}
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
                  isSysAdmin={true}
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
          {this.state.isLoading ? (
            <Loading />
          ) : (
            <>
              {this.state.sharedItems.length === 0 ? (
                <EmptyTip text={gettext('No share link')} className="mt-8 mb-8" />
              ) : (
                <table className="table-thead-hidden">
                  <thead>
                    <tr>
                      <th width="50%">{gettext('Group')}</th>
                      <th width="35%">{gettext('Permission')}</th>
                      <th width="15%"></th>
                    </tr>
                  </thead>
                  <GroupList
                    items={this.state.sharedItems}
                    permissions={this.permissions}
                    deleteShareItem={this.deleteShareItem}
                    onChangeUserPermission={this.onChangeUserPermission}
                  />
                </table>
              )}
            </>
          )}
        </div>
      </Fragment>
    );
  }
}

SysAdminShareToGroup.propTypes = propTypes;

export default SysAdminShareToGroup;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import classnames from 'classnames';
import { gettext, isPro, isSeafilePlus, enableShareToDepartment } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils, isMobile } from '../../utils/utils';
import toaster from '../toast';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import EventBus from '../common/event-bus';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import GroupSelect from '../common/group-select';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';
import OpIcon from '../op-icon';

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOperationShow: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOperationShow: false
    });
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
    const { isHighlighted } = this.state;
    let item = this.props.item;
    let currentPermission = Utils.getSharedPermission(item);
    if (isMobile) {
      return (
        <tr>
          <td className='name'>{item.group_info.name}</td>
          <td>
            <SharePermissionEditor
              repoID={this.props.repoID}
              isTextMode={true}
              autoFocus={true}
              isEditIconShow={true}
              currentPermission={currentPermission}
              permissions={this.props.permissions}
              onPermissionChanged={this.onChangeUserPermission}
            />
          </td>
          <td>
            <OpIcon
              symbol="x-01"
              className="op-icon"
              op={this.deleteShareItem}
              title={gettext('Delete')}
            />
          </td>
        </tr>
      );
    }
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        tabIndex="0"
        onFocus={this.onMouseEnter}
      >
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
          <OpIcon
            symbol="x-01"
            className={`op-icon ${this.state.isOperationShow ? '' : 'd-none'}`}
            op={this.deleteShareItem}
            title={gettext('Delete')}
          />
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
  repo: PropTypes.object,
  onAddCustomPermissionToggle: PropTypes.func,
};

class ShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      selectedOptions: [],
      errorMsg: [],
      permission: 'rw',
      sharedItems: [],
      isWiki: this.props.repoType === 'wiki',
      isLoading: true
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
        obj.name = res.data[i].name;
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
    const eventBus = EventBus.getInstance();
    const { isGroupOwnedRepo, itemPath: path, repoID } = this.props;
    const { permission, selectedOptions } = this.state;
    const targetGroupIds = selectedOptions.map(item => item.id);
    if (isGroupOwnedRepo) {
      seafileAPI.shareGroupOwnedRepoToGroup(repoID, permission, targetGroupIds, path).then(res => {
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

        if (this.props.repo && res.data.success.length > 0) {
          const sharedRepo = { ...this.props.repo, permission: res.data.success[0].permission };
          targetGroupIds.forEach(targetGroupId => {
            eventBus.dispatch(EVENT_BUS_TYPE.ADD_SHARED_REPO_INTO_GROUP, { repo: sharedRepo, group_id: targetGroupId });
          });
        }

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
    } else {
      seafileAPI.shareFolder(repoID, path, 'group', permission, targetGroupIds).then(res => {
        let errorMsg = [];
        if (res.data.failed.length > 0) {
          for (let i = 0 ; i < res.data.failed.length ; i++) {
            errorMsg[i] = res.data.failed[i];
          }
        }

        if (this.props.repo && res.data.success.length > 0) {
          const sharedRepo = { ...this.props.repo, permission: res.data.success[0].permission };
          targetGroupIds.forEach(targetGroupId => {
            eventBus.dispatch(EVENT_BUS_TYPE.ADD_SHARED_REPO_INTO_GROUP, { repo: sharedRepo, group_id: targetGroupId });
          });
        }

        this.setState({
          errorMsg: errorMsg,
          sharedItems: this.state.sharedItems.concat(res.data.success),
          selectedOptions: [],
          permission: 'rw'
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  deleteShareItem = (groupID) => {
    const eventBus = EventBus.getInstance();
    const { isGroupOwnedRepo, itemPath: path, repoID } = this.props;
    if (isGroupOwnedRepo) {
      seafileAPI.deleteGroupOwnedRepoSharedGroupItem(repoID, groupID, path).then(() => {
        eventBus.dispatch(EVENT_BUS_TYPE.UNSHARE_REPO_TO_GROUP, { repo_id: repoID, group_id: groupID });

        this.setState({
          sharedItems: this.state.sharedItems.filter(item => { return item.group_info.id !== groupID; })
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.deleteShareToGroupItem(repoID, path, 'group', groupID).then(() => {
        eventBus.dispatch(EVENT_BUS_TYPE.UNSHARE_REPO_TO_GROUP, { repo_id: repoID, group_id: groupID });

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
    const enableAddCustomPermission = isPro && !isSeafilePlus;
    let thead = (
      <thead>
        <tr>
          <th width="47%">{gettext('Group')}</th>
          <th width="35%">{gettext('Permission')}</th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    if (isMobile) {
      thead = (
        <thead>
          <tr>
            <th width="43%">{gettext('Group')}</th>
            <th width="35%">{gettext('Permission')}</th>
            <th width="22%"></th>
          </tr>
        </thead>
      );
    }
    return (
      <Fragment>
        <table>
          {thead}
          <tbody>
            <tr>
              <td>
                <GroupSelect
                  selectedOptions={this.state.selectedOptions}
                  options={this.state.options}
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
                  enableAddCustomPermission={enableAddCustomPermission}
                  isWiki={this.state.isWiki}
                  onAddCustomPermissionToggle={this.props.onAddCustomPermissionToggle}
                />
              </td>
              <td>
                <Button color="primary" onClick={this.shareToGroup} size={isMobile ? 'sm' : 'md'}>{gettext('Submit')}</Button>
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
                <EmptyTip text={gettext('No share link')} />
              ) : (
                <table className="table-thead-hidden">
                  {thead}
                  <GroupList
                    repoID={this.props.repoID}
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

ShareToGroup.propTypes = propTypes;

export default ShareToGroup;

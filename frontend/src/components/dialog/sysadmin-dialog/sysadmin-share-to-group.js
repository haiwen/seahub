import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import Select from 'react-select';
import { isPro, gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api.js';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import SharePermissionEditor from '../../select-editor/share-permission-editor';

class GroupItem extends React.Component {

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
    this.props.deleteShareItem(item.group_id);
  }

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item, permission);
  }

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
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
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

const propTypes = {
  isGroupOwnedRepo: PropTypes.bool,
  itemPath: PropTypes.string.isRequired,
  itemType: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
};

const NoOptionsMessage = (props) => {
  return (
    <div {...props.innerProps} style={{margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)'}}>{gettext('Group not found')}</div>
  );
};

class SysAdminShareToGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      permission: 'rw',
      sharedItems: []
    };
    this.options = [];
    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions.push('admin', 'cloud-edit', 'preview');
    }
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
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
        obj.value = res.data[i].name;
        obj.id = res.data[i].id;
        obj.label = res.data[i].name;
        this.options.push(obj);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listSharedGroups = () => {
    let repoID = this.props.repoID;
    seafileAPI.sysAdminListRepoSharedItems(repoID, 'group').then((res) => {
      if(res.data.length !== 0) {
        this.setState({
          sharedItems: res.data
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  shareToGroup = () => {
    let groups = [];
    let repoID = this.props.repoID;
    if (this.state.selectedOption && this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        groups[i] = this.state.selectedOption[i].id;
      }
    }
    seafileAPI.sysAdminAddRepoSharedItem(repoID, 'group', groups, this.state.permission).then(res => {
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
        selectedOption: null,
        permission: 'rw',
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteShareItem = (groupID) => {
    let repoID = this.props.repoID;
    seafileAPI.sysAdminDeleteRepoSharedItem(repoID, 'group', groupID).then(() => {
      this.setState({
        sharedItems: this.state.sharedItems.filter(item => { return item.group_id !== groupID; })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onChangeUserPermission = (item, permission) => {
    let repoID = this.props.repoID;
    let groupID = item.group_id;
    seafileAPI.sysAdminUpdateRepoSharedItemPermission(repoID, 'group', groupID, permission).then(() => {
      this.updateSharedItems(item, permission);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

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
    this.setState({sharedItems: sharedItems});
  }

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
                <Select
                  isMulti
                  onChange={this.handleSelectChange}
                  options={this.options}
                  placeholder={gettext('Select groups...')}
                  maxMenuHeight={200}
                  inputId={'react-select-2-input'}
                  value={this.state.selectedOption}
                  components={{ NoOptionsMessage }}
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
                />
              </td>
              <td>
                <Button onClick={this.shareToGroup}>{gettext('Submit')}</Button>
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
        </div>
      </Fragment>
    );
  }
}

SysAdminShareToGroup.propTypes = propTypes;

export default SysAdminShareToGroup;

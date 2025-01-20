import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, InputGroup } from 'reactstrap';
import { gettext, isPro, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import FileChooser from '../file-chooser';
import GroupSelect from '../common/group-select';
import toaster from '../../components/toast';

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

  deleteGroupPermissionItem = () => {
    let item = this.props.item;
    this.props.deleteGroupPermissionItem(item);
  };

  onChangeGroupPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeGroupPermission(item, permission);
  };

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td>
          <a href={`${siteRoot}group/${item.group_id}/`} target="_blank" rel="noreferrer">{item.group_name}</a>
        </td>
        {this.props.showPath &&
          <td>
            <a href={`${siteRoot}library/${item.repo_id}/${Utils.encodePath(this.props.repoName + item.folder_path)}`}>{item.folder_name}</a>
          </td>
        }
        <td>
          <SharePermissionEditor
            isTextMode={true}
            autoFocus={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={item.permission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeGroupPermission}
          />
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteGroupPermissionItem}
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
  item: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  showPath: PropTypes.bool.isRequired,
  repoName: PropTypes.string,
  deleteGroupPermissionItem: PropTypes.func.isRequired,
  onChangeGroupPermission: PropTypes.func.isRequired,
};

const propTypes = {
  repoID: PropTypes.string.isRequired,
  isDepartmentRepo: PropTypes.bool,
  repoName: PropTypes.string,
  folderPath: PropTypes.string,
};

class LibSubFolderSetGroupPermissionDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOptions: [],
      errorMsg: [],
      permission: 'rw',
      groupPermissionItems: [],
      folderPath: '',
      showFileChooser: false
    };
    this.options = [];
    if (!isPro) {
      this.permissions = ['r', 'rw'];
    } else {
      this.permissions = ['r', 'rw', 'cloud-edit', 'preview', 'invisible'];
    }
  }

  componentDidMount() {
    this.loadOptions();
    this.listGroupPermissionItems();
  }

  loadOptions = () => {
    seafileAPI.shareableGroups().then((res) => {
      this.options = res.data.map((item, index) => {
        return {
          id: item.id,
          label: item.name,
          name: item.name,
          value: item.name
        };
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listGroupPermissionItems = () => {
    const { isDepartmentRepo, repoID, folderPath } = this.props;
    const request = isDepartmentRepo ?
      seafileAPI.listDepartmentRepoGroupFolderPerm(repoID, folderPath) :
      seafileAPI.listGroupFolderPerm(repoID, folderPath);
    request.then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          groupPermissionItems: res.data
        });
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

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  addGroupFolderPerm = () => {
    const { selectedOptions } = this.state;
    const folderPath = this.props.folderPath || this.state.folderPath;
    if (selectedOptions.length === 0 || !folderPath) {
      return false;
    }

    const targetGroupIds = selectedOptions.map(op => op.id);
    const request = this.props.isDepartmentRepo ?
      seafileAPI.addDepartmentRepoGroupFolderPerm(this.props.repoID, this.state.permission, folderPath, targetGroupIds) :
      seafileAPI.addGroupFolderPerm(this.props.repoID, this.state.permission, folderPath, targetGroupIds);
    request.then(res => {
      let errorMsg = [];
      if (res.data.failed.length > 0) {
        for (let i = 0; i < res.data.failed.length; i++) {
          errorMsg[i] = res.data.failed[i];
        }
      }
      this.setState({
        errorMsg: errorMsg,
        groupPermissionItems: this.state.groupPermissionItems.concat(res.data.success),
        selectedOptions: [],
        permission: 'rw',
        folderPath: ''
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteGroupPermissionItem = (item) => {
    const request = this.props.isDepartmentRepo ?
      seafileAPI.deleteDepartmentRepoGroupFolderPerm(item.repo_id, item.permission, item.folder_path, item.group_id) :
      seafileAPI.deleteGroupFolderPerm(item.repo_id, item.permission, item.folder_path, item.group_id);
    request.then(() => {
      this.setState({
        groupPermissionItems: this.state.groupPermissionItems.filter(deletedItem => { return deletedItem != item; })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onChangeGroupPermission = (item, permission) => {
    const request = this.props.isDepartmentRepo ?
      seafileAPI.updateDepartmentRepoGroupFolderPerm(item.repo_id, permission, item.folder_path, item.group_id) :
      seafileAPI.updateGroupFolderPerm(item.repo_id, permission, item.folder_path, item.group_id);
    request.then(() => {
      this.updateGroupPermission(item, permission);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateGroupPermission = (item, permission) => {
    let groupID = item.group_id;
    let groupPermissionItems = this.state.groupPermissionItems.map(sharedItem => {
      let sharedItemGroupID = sharedItem.group_id;
      if (groupID === sharedItemGroupID && item.folder_path === sharedItem.folder_path) {
        sharedItem.permission = permission;
      }
      return sharedItem;
    });
    this.setState({ groupPermissionItems: groupPermissionItems });
  };

  onSetSubFolder = (e) => {
    this.setState({
      folderPath: e.target.value
    });
  };

  toggleFileChooser = () => {
    this.setState({
      showFileChooser: !this.state.showFileChooser,
      folderPath: ''
    });
  };

  toggleSubFolder = (repo, path, item) => {
    this.setState({
      folderPath: path,
    });
  };

  handleSubmit = () => {
    this.setState({
      folderPath: this.state.folderPath || '/',
      showFileChooser: !this.state.showFileChooser
    });
  };

  onRepoItemClick = () => {
    this.setState({
      folderPath: '/'
    });
  };

  render() {
    let showPath = this.props.folderPath ? false : true;

    if (this.state.showFileChooser) {
      return (
        <div>
          <FileChooser
            repoID={this.props.repoID}
            mode={'only_current_library'}
            onDirentItemClick={this.toggleSubFolder}
            onRepoItemClick={this.onRepoItemClick}
          />
          <div className="modal-footer">
            <Button color="secondary" onClick={this.toggleFileChooser}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          </div>
        </div>
      );
    }

    const thead = (
      <thead>
        <tr>
          <th width={showPath ? '32%' : '55%'}>{gettext('Group')}</th>
          {showPath &&
          <th width="32%">{gettext('Folder')}</th>
          }
          <th width={showPath ? '24%' : '30%'}>{gettext('Permission')}</th>
          <th width={showPath ? '12%' : '15%'}></th>
        </tr>
      </thead>
    );
    return (
      <Fragment>
        <p className="text-gray small">{gettext('Folder permission is only effective after the library is shared to users or groups. It is used to fine tune sub-folder permissions.')}</p>
        <table className="w-xs-250">
          {thead}
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
              {showPath &&
                <td>
                  <InputGroup>
                    <Input value={this.state.folderPath} onChange={this.onSetSubFolder} />
                    <Button className="sf2-icon-plus" onClick={this.toggleFileChooser}></Button>
                  </InputGroup>
                </td>
              }
              <td>
                <SharePermissionEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                />
              </td>
              <td>
                <Button color="primary" onClick={this.addGroupFolderPerm}>{gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&
              this.state.errorMsg.map((item, index) => {
                let errMessage = item.group_id + ': ' + item.error_msg;
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
          <table className="table-thead-hidden w-xs-250">
            {thead}
            <tbody>
              {this.state.groupPermissionItems.map((item, index) => {
                return (
                  <GroupItem
                    key={index}
                    item={item}
                    permissions={this.permissions}
                    deleteGroupPermissionItem={this.deleteGroupPermissionItem}
                    onChangeGroupPermission={this.onChangeGroupPermission}
                    showPath={showPath}
                    repoName={this.props.repoName}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </Fragment>
    );
  }
}

LibSubFolderSetGroupPermissionDialog.propTypes = propTypes;

export default LibSubFolderSetGroupPermissionDialog;

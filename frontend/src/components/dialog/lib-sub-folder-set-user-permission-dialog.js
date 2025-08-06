import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext, isPro, siteRoot } from '../../utils/constants';
import { Button, Input, InputGroup } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import UserSelect from '../user-select';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import FileChooser from '../file-chooser';
import toaster from '../../components/toast';
import BackIcon from '../../components/back-icon';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';

class UserItem extends React.Component {

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

  deleteUserFolderPermission = () => {
    let item = this.props.item;
    this.props.deleteUserFolderPermission(item);
  };

  onChangeUserFolderPerm = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserFolderPerm(item.repo_id, permission, item.folder_path, item.user_email);
  };

  render() {
    let item = this.props.item;
    let currentPermission = item.permission;
    const { isHighlighted } = this.state;
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
      >
        <td>
          <a href={`${siteRoot}profile/${encodeURIComponent(item.user_email)}/`} target="_blank" rel="noreferrer">{item.user_name}</a>
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
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserFolderPerm}
          />
        </td>
        <td>
          <i
            tabIndex="0"
            role="button"
            className={`sf3-font sf3-font-x-01 op-icon ${this.state.isOperationShow ? '' : 'd-none'}`}
            onClick={this.deleteUserFolderPermission}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </i>
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = {
  item: PropTypes.object.isRequired,
  permissions: PropTypes.array.isRequired,
  deleteUserFolderPermission: PropTypes.func.isRequired,
  onChangeUserFolderPerm: PropTypes.func.isRequired,
  showPath: PropTypes.bool.isRequired,
  repoName: PropTypes.string,
};


const propTypes = {
  repoID: PropTypes.string.isRequired,
  isDepartmentRepo: PropTypes.bool,
  folderPath: PropTypes.string,
  repoName: PropTypes.string,
};


class LibSubFolderSetUserPermissionDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errorMsg: [],
      permission: 'rw',
      userFolderPermItems: [],
      folderPath: '',
      showFileChooser: false,
      isLoading: true
    };
    if (!isPro) {
      this.permissions = ['r', 'rw'];
    } else {
      this.permissions = ['r', 'rw', 'cloud-edit', 'preview', 'invisible'];
    }
  }

  handleUserSelectChange = (option) => {
    this.setState({ selectedUsers: option });
  };

  componentDidMount() {
    const { repoID, folderPath, isDepartmentRepo } = this.props;
    const request = isDepartmentRepo ?
      seafileAPI.listDepartmentRepoUserFolderPerm(repoID, folderPath) :
      seafileAPI.listUserFolderPerm(repoID, folderPath);
    request.then((res) => {
      if (res.data.length !== 0) {
        this.setState({
          userFolderPermItems: res.data,
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
  }

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  addUserFolderPerm = () => {
    const { selectedUsers } = this.state;
    const folderPath = this.props.folderPath || this.state.folderPath;
    if (!selectedUsers || !selectedUsers.length || !folderPath) { // selectedUsers: null or []
      return false;
    }

    const users = selectedUsers.map((item, index) => item.email);

    const request = this.props.isDepartmentRepo ?
      seafileAPI.addDepartmentRepoUserFolderPerm(this.props.repoID, this.state.permission, folderPath, users) :
      seafileAPI.addUserFolderPerm(this.props.repoID, this.state.permission, folderPath, users);
    request.then(res => {
      let errorMsg = [];
      if (res.data.failed.length > 0) {
        for (let i = 0; i < res.data.failed.length; i++) {
          errorMsg[i] = res.data.failed[i];
        }
      }
      this.setState({
        errorMsg: errorMsg,
        userFolderPermItems: this.state.userFolderPermItems.concat(res.data.success),
        selectedUsers: [],
        permission: 'rw',
        folderPath: '',
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteUserFolderPermItem = (item) => {
    const request = this.props.isDepartmentRepo ?
      seafileAPI.deleteDepartmentRepoUserFolderPerm(item.repo_id, item.permission, item.folder_path, item.user_email) :
      seafileAPI.deleteUserFolderPerm(item.repo_id, item.permission, item.folder_path, item.user_email);
    request.then(res => {
      this.setState({
        userFolderPermItems: this.state.userFolderPermItems.filter(deletedItem => {
          return deletedItem != item;
        })
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onChangeUserFolderPerm = (repoID, permission, folderPath, userEmail) => {
    const request = this.props.isDepartmentRepo ?
      seafileAPI.updateDepartmentRepoUserFolderPerm(repoID, permission, folderPath, userEmail) :
      seafileAPI.updateUserFolderPerm(repoID, permission, folderPath, userEmail);
    request.then(res => {
      let userFolderPermItems = this.state.userFolderPermItems.map(item => {
        if (item.user_email === userEmail && item.folder_path === folderPath) {
          item.permission = permission;
        }
        return item;
      });
      this.setState({ userFolderPermItems: userFolderPermItems });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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

  handleFileChooserSubmit = () => {
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
    let { userFolderPermItems } = this.state;

    if (this.state.showFileChooser) {
      return (
        <>
          <div className="d-flex align-items-center justify-content-between pb-2 border-bottom">
            <h6 className="font-weight-normal m-0">
              <BackIcon onClick={this.toggleFileChooser} />
              {gettext('Add Folder')}
            </h6>
            <Button color="primary" size="sm" outline={true} onClick={this.handleFileChooserSubmit}>{gettext('Submit')}</Button>
          </div>
          <FileChooser
            repoID={this.props.repoID}
            mode={'only_current_library'}
            onDirentItemClick={this.toggleSubFolder}
            onRepoItemClick={this.onRepoItemClick}
          />
        </>
      );
    }

    const thead = (
      <thead>
        <tr>
          <th width={showPath ? '32%' : '55%'}>{gettext('User')}</th>
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
        <p className="small permission-tips">{gettext('Folder permission is only effective after the library is shared to users or groups. It is used to fine tune sub-folder permissions.')}</p>
        <table className="w-xs-250">
          {thead}
          <tbody>
            <tr>
              <td>
                <UserSelect
                  isMulti={true}
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleUserSelectChange}
                  selectedUsers={this.state.selectedUsers}
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
                <Button color="primary" onClick={this.addUserFolderPerm}>{gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&
              this.state.errorMsg.map((item, index) => {
                let errMessage = '';
                if (item.user_email) {
                  errMessage = item.user_email + ': ' + item.error_msg;
                } else {
                  errMessage = item;
                }
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
              {userFolderPermItems.length === 0 ? (
                <EmptyTip text={gettext('No results')} />
              ) : (
                <table className="table-thead-hidden w-xs-250">
                  {thead}
                  <tbody>
                    {userFolderPermItems.map((item, index) => {
                      return (
                        <UserItem
                          key={index}
                          item={item}
                          permissions={this.permissions}
                          deleteUserFolderPermission={this.deleteUserFolderPermItem}
                          onChangeUserFolderPerm={this.onChangeUserFolderPerm}
                          showPath={showPath}
                          repoName={this.props.repoName}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </Fragment>
    );
  }
}

LibSubFolderSetUserPermissionDialog.propTypes = propTypes;

export default LibSubFolderSetUserPermissionDialog;

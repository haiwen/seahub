import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import Select from 'react-select';
import makeAnimated from 'react-select/lib/animated';
import { gettext, isPro, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api.js';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import FileChooser from '../file-chooser/file-chooser';

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

  deleteGroupPermissionItem = () => {
    let item = this.props.item;
    this.props.deleteGroupPermissionItem(item);
  }

  onChangeGroupPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeGroupPermission(item, permission);
  }

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className='name'>
          <a href={siteRoot + 'group/' + item.group_id} target="_blank">{item.group_name}</a>
        </td>
        {this.props.showPath &&
          <td>
          <a href={siteRoot + 'library/' + item.repo_id + '/' + this.props.repoName + item.folder_path}>{item.folder_name}</a>
          </td>
        }
        <td>
          <SharePermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={item.permission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeGroupPermission}
          />
        </td>
        <td>
          <span
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteGroupPermissionItem} 
            title={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

const propTypes = {
  repoID: PropTypes.string.isRequired
};

const NoOptionsMessage = (props) => {
  return (
    <div {...props.innerProps} style={{margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)'}}>{gettext('Group not found')}</div>
  );
};

class LibSubFolderSerGroupPermissionDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
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
      this.permissions = ['r', 'rw', 'admin', 'cloud-edit', 'preview']
    }

  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  componentDidMount() {
    this.loadOptions();
    this.listGroupPermissionItems();
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
    });
  }

  listGroupPermissionItems = () => {
    let repoID = this.props.repoID; 
    let folderPath = this.props.folderPath;
    seafileAPI.listGroupFolderPerm(repoID, folderPath).then((res) => {
      if(res.data.length !== 0) {
        this.setState({
          groupPermissionItems: res.data
        });
      }
    });
  }

  setPermission = (permission) => {
    this.setState({permission: permission});
  }

  addGroupFolderPerm = () => {
    let path = this.state.folderPath;
    let repoID = this.props.repoID; 

    if (this.props.folderPath) {
      path = this.props.folderPath;
    }

    seafileAPI.addGroupFolderPerm(repoID, this.state.permission, path, this.state.selectedOption.id).then(res => {
      let errorMsg = [];
      if (res.data.failed.length > 0) {
        for (let i = 0 ; i < res.data.failed.length ; i++) {
          errorMsg[i] = res.data.failed[i];
        }
      }

      this.setState({
        errorMsg: errorMsg,
        groupPermissionItems: this.state.groupPermissionItems.concat(res.data.success),
        selectedOption: null,
        permission: 'rw',
        folderPath: ''
      });
    });
  }

  deleteGroupPermissionItem = (item) => {
    seafileAPI.deleteGroupFolderPerm(item.repo_id, item.permission, item.folder_path, item.group_id).then(() => {
      this.setState({
        groupPermissionItems: this.state.groupPermissionItems.filter(deletedItem => { return deletedItem != item; }) 
      });
    });
  }

  onChangeGroupPermission = (item, permission) => {
    seafileAPI.updateGroupFolderPerm(item.repoID, item.permission, item.folder_path, item.group_id).then(() => {
      this.updateGroupPermission(item, permission);
    });
  }
  
  updateGroupPermission = (item, permission) => {
    let groupID = item.group_id;
    let groupPermissionItems = this.state.groupPermissionItems.map(sharedItem => {
      let sharedItemGroupID = sharedItem.group_id;
      if (groupID === sharedItemGroupID && item.folder_path === sharedItem.folder_path) {
        sharedItem.permission = permission;
      }
      return sharedItem;
    });
    this.setState({groupPermissionItems: groupPermissionItems});
  }

  onSetSubFolder = (e) => {
    this.setState({
      folderPath: e.target.value 
    })
  }

  toggleFileChooser = () => {
    this.setState({
      showFileChooser: !this.state.showFileChooser,
      folderPath: ''
    })
  }

  toggleSubFolder = (repo, path, item) => {
    this.setState({
      folderPath: path,
    }) 
  }

  handleSubmit = () => {
    this.setState({
      showFileChooser: !this.state.showFileChooser
    })
  }

  onRepoItemClick = () => {
     this.setState({
      folderPath: '/' 
     })
  }

  render() {
    let showPath = this.props.folderPath ? false : true;

    if (this.state.showFileChooser) {
      return (
        <div>
          <FileChooser repoID={this.props.repoID} 
                       mode={'only_current_library'}
                       onDirentItemClick={this.toggleSubFolder}
                       onRepoItemClick={this.onRepoItemClick}
          />
          <div className="modal-footer">
            <Button color="secondary" onClick={this.toggleFileChooser}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          </div>
        </div>
      )
    }

    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width={showPath ? '32%': '55%'}>{gettext('Group')}</th>
              {showPath &&
                <th width="32%">{gettext('Path')}</th>
              }
              <th width={showPath ? "26%": "30%"}>{gettext('Permission')}</th>
              <th width={showPath ? "10%" : "15%"}></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Select
                  onChange={this.handleSelectChange}
                  options={this.options}
                  placeholder={gettext('Select a group')}
                  components={makeAnimated()}
                  maxMenuHeight={200}
                  inputId={'react-select-2-input'}
                  value={this.state.selectedOption}
                  components={{ NoOptionsMessage }}
                />
              </td>
              {showPath &&
                <td>
                  <InputGroup>
                    <Input value={this.state.folderPath} onChange={this.onSetSubFolder}/>
                    <InputGroupAddon addonType="append"><Button className="sf2-icon-plus" onClick={this.toggleFileChooser}></Button></InputGroupAddon>
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
                <Button onClick={this.addGroupFolderPerm}>{gettext('Submit')}</Button>
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
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width={showPath ? '32%': '55%'}>{gettext('Group')}</th>
                {showPath &&
                  <th width="32%">{gettext('Path')}</th>
                }
                <th width={showPath ? "26%": "30%"}>{gettext('Permission')}</th>
                <th width={showPath ? "10%" : "15%"}></th>
              </tr>
            </thead>
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

LibSubFolderSerGroupPermissionDialog.propTypes = propTypes;

export default LibSubFolderSerGroupPermissionDialog;

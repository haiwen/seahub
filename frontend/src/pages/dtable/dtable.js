import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, username } from '../../utils/constants';
import Loading from '../../components/loading';
import CreateWorkspaceDialog from '../../components/dialog/create-workspace-dialog';
import DeleteWorkspaceDialog from '../../components/dialog/delete-workspace-dialog';
import CreateTableDialog from '../../components/dialog/create-table-dialog';
import DeleteTableDialog from '../../components/dialog/delete-table-dialog';
import ShareWorkspaceDialog from '../../components/dialog/share-workspace-dialog';
import LeaveShareWorkspaceDialog from '../../components/dialog/leave-share-workspace-dialog';
import Rename from '../../components/rename';
import '../../css/dtable-page.css';

moment.locale(window.app.config.lang);


const tablePropTypes = {
  table: PropTypes.object.isRequired,
  workspaceID: PropTypes.number.isRequired,
  renameTable: PropTypes.func.isRequired,
  deleteTable: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  hasWritePermission: PropTypes.bool.isRequired,
};

class Table extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isTableRenaming: false,
      isTableDeleting: false,
      dropdownOpen: false,
      active: false,
    };
  }

  onRenameTableCancel = () => {
    this.setState({isTableRenaming: !this.state.isTableRenaming});
    this.props.onUnfreezedItem();
  }

  onRenameTableConfirm = (newTableName) => {
    let oldTableName = this.props.table.name;
    this.props.renameTable(oldTableName, newTableName);
    this.onRenameTableCancel();
  }

  onDeleteTableCancel = () => {
    this.setState({isTableDeleting: !this.state.isTableDeleting});
    this.props.onUnfreezedItem();
  }

  onDeleteTableSubmit = () => {
    let tableName = this.props.table.name;
    this.props.deleteTable(tableName);
    this.onDeleteTableCancel();
  }

  dropdownToggle = () => {
    if (this.state.dropdownOpen) {
      this.props.onUnfreezedItem();
    } else {
      this.props.onFreezedItem();
    }
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  onMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({
      active: true
    });
  }

  onMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({
      active: false
    });
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.isItemFreezed) {
      this.setState({ active: false });
    }
  }

  render() {

    let table = this.props.table;
    let tableHref = siteRoot + 'workspace/' + this.props.workspaceID + '/dtable/' + table.name + '/';

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={this.state.active ? 'tr-highlight' : ''}>
        <td><img src={siteRoot + 'media/img/data-base.svg'} alt="" width="24"/></td>
        <td>
          {this.state.isTableRenaming &&
            <Rename
              hasSuffix={true}
              name={table.name}
              onRenameConfirm={this.onRenameTableConfirm}
              onRenameCancel={this.onRenameTableCancel}
            />
          }
          {!this.state.isTableRenaming &&
            <a href={tableHref} target="_blank">{table.name}</a>
          }
        </td>
        <td>{table.modifier}</td>
        <td>{moment(table.mtime).fromNow()}</td>
        <td>
          {(this.state.active && this.props.hasWritePermission) &&
            <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-1 old-history-more-operation">
              <DropdownToggle
                tag='i'
                className='fa fa-ellipsis-v cursor-pointer attr-action-icon'
                title={gettext('More Operations')}
                data-toggle="dropdown" 
                aria-expanded={this.state.dropdownOpen}
              >
              </DropdownToggle>
              <DropdownMenu className="drop-list" right={true}>
                <DropdownItem onClick={this.onRenameTableCancel}>{gettext('Rename')}</DropdownItem>
                <DropdownItem onClick={this.onDeleteTableCancel}>{gettext('Delete')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
          {this.state.isTableDeleting &&
            <DeleteTableDialog
              currentTable={table}
              deleteCancel={this.onDeleteTableCancel}
              handleSubmit={this.onDeleteTableSubmit}
            />
          }
        </td>
      </tr>
    );
  }
}

Table.propTypes = tablePropTypes;


const workspacePropTypes = {
  workspace: PropTypes.object.isRequired,
  renameWorkspace: PropTypes.func,
  deleteWorkspace: PropTypes.func,
  deleteUserShareWorkspace: PropTypes.func,
  isOwner: PropTypes.bool.isRequired,
};

class Workspace extends Component {

  constructor(props) {
    super(props);
    this.writePermissions = ['rw', 'admin'];
    this.state = {
      tableList: this.props.workspace.table_list,
      errorMsg: '',
      isWorkspaceRenaming: false,
      isWorkspaceDeleting: false,
      isWorkspaceSharing: false,
      isWorkspaceLeaveSharing: false,
      isShowAddTableDialog: false,
      dropdownOpen: false,
      isItemFreezed: false,
      hasWritePermission: this.props.isOwner || (!this.props.isOwner && this.writePermissions.includes(this.props.workspace.permission)),
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }
  
  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onAddTable = () => {
    this.setState({
      isShowAddTableDialog: !this.state.isShowAddTableDialog,
    });
  }

  createTable = (tableName) => {
    let workspaceID = this.props.workspace.id;
    seafileAPI.createTable(workspaceID, tableName).then((res) => {
      this.state.tableList.push(res.data.table);
      this.setState({tableList: this.state.tableList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
    this.onAddTable();
  }

  renameTable = (oldTableName, newTableName) => {
    let workspaceID = this.props.workspace.id;
    seafileAPI.renameTable(workspaceID, oldTableName, newTableName).then((res) => {
      let tableList = this.state.tableList.map((table) => {
        if (table.name === oldTableName) {
          table = res.data.table;
        }
        return table;
      });
      this.setState({tableList: tableList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  deleteTable = (tableName) => {
    let workspaceID = this.props.workspace.id;
    seafileAPI.deleteTable(workspaceID, tableName).then(() => {
      let tableList = this.state.tableList.filter(table => {
        return table.name !== tableName;
      });
      this.setState({tableList: tableList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  onRenameWorkspaceCancel = () => {
    this.setState({isWorkspaceRenaming: !this.state.isWorkspaceRenaming});
  }

  onRenameWorkspaceConfirm = (newName) => {
    let workspace = this.props.workspace;
    this.props.renameWorkspace(workspace, newName);
    this.onRenameWorkspaceCancel();
  }

  onDeleteWorkspaceCancel = () => {
    this.setState({isWorkspaceDeleting: !this.state.isWorkspaceDeleting});
  }

  onDeleteWorkspaceSubmit = () => {
    let workspace = this.props.workspace;
    this.props.deleteWorkspace(workspace);
    this.onDeleteWorkspaceCancel();
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  onUserShareWorkspaceCancel = () => {
    this.setState({isWorkspaceSharing: !this.state.isWorkspaceSharing});
  }

  onDeleteUserShareWorkspaceCancel = () => {
    this.setState({isWorkspaceLeaveSharing: !this.state.isWorkspaceLeaveSharing});
  }

  onDeleteUserShareWorkspaceSubmit = () => {
    let workspace = this.props.workspace;
    this.props.deleteUserShareWorkspace(workspace);
    this.onDeleteUserShareWorkspaceCancel();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.workspace.table_list !== this.props.workspace.table_list) {
      this.setState({
        tableList: nextProps.workspace.table_list
      });
    }
  }

  render() {
    let { workspace, isOwner }= this.props;

    return(
      <div className="workspace my-2">
        <Fragment>
          {this.state.isWorkspaceRenaming &&
            <Rename
              hasSuffix={false}
              name={workspace.name}
              onRenameConfirm={this.onRenameWorkspaceConfirm}
              onRenameCancel={this.onRenameWorkspaceCancel}
            />
          }
          {!this.state.isWorkspaceRenaming &&
            <span className="mb-2 workspace-name-container">
              <span className="workspace-name">{workspace.name}</span>
              <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down">
                <DropdownToggle
                  caret={true}
                  tag='i'
                  title={gettext('More Operations')}
                  data-toggle="dropdown" 
                  aria-expanded={this.state.dropdownOpen}
                >
                </DropdownToggle>
                <DropdownMenu className="drop-list" right={true}>
                  {isOwner && <DropdownItem onClick={this.onRenameWorkspaceCancel}>{gettext('Rename')}</DropdownItem>}
                  {isOwner && <DropdownItem onClick={this.onDeleteWorkspaceCancel}>{gettext('Delete')}</DropdownItem>}
                  {isOwner && <DropdownItem onClick={this.onUserShareWorkspaceCancel}>{gettext('Share')}</DropdownItem>}
                  {!isOwner && <DropdownItem onClick={this.onDeleteUserShareWorkspaceCancel}>{gettext('Leave Share')}</DropdownItem>}
                </DropdownMenu>
              </Dropdown>
              {this.state.isWorkspaceDeleting &&
                <DeleteWorkspaceDialog
                  currentWorkspace={workspace}
                  deleteCancel={this.onDeleteWorkspaceCancel}
                  handleSubmit={this.onDeleteWorkspaceSubmit}
                />
              }
              {this.state.isWorkspaceSharing &&
                <ShareWorkspaceDialog
                  currentWorkspace={workspace}
                  userShareCancel={this.onUserShareWorkspaceCancel}
                />
              }
              {this.state.isWorkspaceLeaveSharing &&
                <LeaveShareWorkspaceDialog
                  currentWorkspace={workspace}
                  leaveUserShareCancel={this.onDeleteUserShareWorkspaceCancel}
                  handleSubmit={this.onDeleteUserShareWorkspaceSubmit}
                />
              }
            </span>
          }
        </Fragment>
        {this.state.hasWritePermission &&
        <div className="d-flex add-table-btn-container">
          <div className="add-table-btn cursor-pointer" onClick={this.onAddTable}>
            <i className="fa fa-plus"></i>
          </div>
          {this.state.isShowAddTableDialog &&
            <CreateTableDialog
              onAddTable={this.onAddTable}
              createTable={this.createTable}
            />
          }
          <span>{gettext('Add a DTable')}</span>
        </div>
        }
        <table width="100%" className="table-vcenter">
          <colgroup>
            <col width="4%"/><col width="31%"/><col width="30%"/><col width="27%"/><col width="8%"/>
          </colgroup>
          <tbody>
            {this.state.tableList.map((table, index) => {
              return (
                <Table
                  key={index}
                  table={table}
                  workspaceID={workspace.id}
                  renameTable={this.renameTable}
                  deleteTable={this.deleteTable}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  isItemFreezed={this.state.isItemFreezed}
                  hasWritePermission={this.state.hasWritePermission}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

Workspace.propTypes = workspacePropTypes;

class DTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      workspaceList: [],
      userShareWorkspaceList: [],
      isShowAddWorkspaceDialog: false,
    };
  }

  onAddWorkspace = () => {
    this.setState({
      isShowAddWorkspaceDialog: !this.state.isShowAddWorkspaceDialog,
    });
  }

  createWorkspace = (name) => {
    seafileAPI.createWorkspace(name).then((res) => {
      this.state.workspaceList.push(res.data.workspace);
      this.setState({workspaceList: this.state.workspaceList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
    this.onAddWorkspace();
  }

  renameWorkspace = (workspace, name) => {
    let workspaceID = workspace.id;
    seafileAPI.renameWorkspace(workspaceID, name).then((res) => {
      let workspaceList = this.state.workspaceList.map((workspace) => {
        if (workspace.id === workspaceID) {
          workspace = res.data.workspace;
        }
        return workspace;
      });
      this.setState({workspaceList: workspaceList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  deleteWorkspace = (workspace) => {
    let workspaceID = workspace.id;
    seafileAPI.deleteWorkspace(workspaceID).then(() => {
      let workspaceList = this.state.workspaceList.filter(workspace => {
        return workspace.id !== workspaceID;
      });
      this.setState({workspaceList: workspaceList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  }

  deleteUserShareWorkspace= (workspace) => {
    let workspaceID = workspace.id;
    seafileAPI.deleteUserShareWorkspace(workspaceID, username).then(() => {
      let userShareWorkspaceList = this.state.userShareWorkspaceList.filter(workspace => {
        return workspace.id !== workspaceID;
      });
      this.setState({userShareWorkspaceList: userShareWorkspaceList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
  };

  componentDidMount() {
    seafileAPI.listWorkspaces().then((res) => {
      this.setState({
        loading: false,
        workspaceList: res.data.workspace_list,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          loading: false,
          errorMsg: gettext('Error')
        });
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
    seafileAPI.listUserShareWorkspaces().then((res) => {
      this.setState({
        userShareWorkspaceList: res.data.workspace_list,
      });
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="starred">
          <div className="cur-view-path">
            <h3 className="sf-heading">DTable</h3>
          </div>
          <div className="cur-view-content">
            {this.state.loading && <Loading />}
            {(!this.state.loading && this.state.errorMsg) && 
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.loading &&
              <Fragment>
                {this.state.workspaceList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      renameWorkspace={this.renameWorkspace}
                      deleteWorkspace={this.deleteWorkspace}
                      isOwner={true}
                    />
                  );
                })}
                <div className="my-2">
                  <span className="add-workspace cursor-pointer" onClick={this.onAddWorkspace}>
                    <i className="fa fa-plus"></i>{' '}{gettext('Add a Workspace')}
                  </span>
                  {this.state.isShowAddWorkspaceDialog &&
                    <CreateWorkspaceDialog
                      createWorkspace={this.createWorkspace}
                      onAddWorkspace={this.onAddWorkspace}
                    />
                  }
                </div>
                <hr style={{width: '100%'}}/>
                <div className="sf-heading">{gettext('Shared with me')}</div>
                {this.state.userShareWorkspaceList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      deleteUserShareWorkspace={this.deleteUserShareWorkspace}
                      isOwner={false}
                    />
                  );
                })}
              </Fragment>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default DTable;

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import Loading from '../../components/loading';
import CreateWorkspaceDialog from '../../components/dialog/create-workspace-dialog';
import DeleteWorkspaceDialog from '../../components/dialog/delete-workspace-dialog';
import CreateTableDialog from '../../components/dialog/create-table-dialog';
import DeleteTableDialog from '../../components/dialog/delete-table-dialog';
import Rename from '../../components/rename';

moment.locale(window.app.config.lang);


const tablePropTypes = {
  table: PropTypes.object.isRequired,
  workspaceID: PropTypes.number.isRequired,
  renameTable: PropTypes.func.isRequired,
  deleteTable: PropTypes.func.isRequired,
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
  }

  onRenameTableConfirm = (newTableName) => {
    let oldTableName = this.props.table.name;
    this.props.renameTable(oldTableName, newTableName);
    this.onRenameTableCancel();
  }

  onDeleteTableCancel = () => {
    this.setState({isTableDeleting: !this.state.isTableDeleting});
  }

  onDeleteTableSubmit = () => {
    let tableName = this.props.table.name;
    console.log(tableName);
    this.props.deleteTable(tableName);
    this.onDeleteTableCancel();
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  }

  render() {

    let table = this.props.table;
    let tableHref = siteRoot + 'workspace/' + this.props.workspaceID + '/dtable/' + table.name + '/';

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td></td>
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
          {this.state.active &&
            <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-1 old-history-more-operation">
              <DropdownToggle
                tag='i'
                className='fa fa-ellipsis-v'
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
  renameWorkspace: PropTypes.func.isRequired,
  deleteWorkspace: PropTypes.func.isRequired,
};

class Workspace extends Component {

  constructor(props) {
    super(props);
    this.state = {
      tableList: this.props.workspace.table_list,
      errorMsg: '',
      isWorkspaceRenaming: false,
      isWorkspaceDeleting: false,
      isShowAddTableDialog: false,
      dropdownOpen: false,
    };
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

  render() {
    let workspace = this.props.workspace;

    return(
      <Fragment>
        <tr>
          <td colSpan='5'>
            {this.state.isWorkspaceRenaming &&
              <Rename
                hasSuffix={false}
                name={workspace.name}
                onRenameConfirm={this.onRenameWorkspaceConfirm}
                onRenameCancel={this.onRenameWorkspaceCancel}
              />
            }
            {!this.state.isWorkspaceRenaming &&
              <div>
                {workspace.name}
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
                    <DropdownItem onClick={this.onRenameWorkspaceCancel}>{gettext('Rename')}</DropdownItem>
                    <DropdownItem onClick={this.onDeleteWorkspaceCancel}>{gettext('Delete')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                {this.state.isWorkspaceDeleting &&
                  <DeleteWorkspaceDialog
                    currentWorkspace={workspace}
                    deleteCancel={this.onDeleteWorkspaceCancel}
                    handleSubmit={this.onDeleteWorkspaceSubmit}
                  />
                }
              </div>
            }
          </td>
        </tr>
        {this.state.tableList.map((table, index) => {
          return (
            <Table
              key={index}
              table={table}
              workspaceID={workspace.id}
              renameTable={this.renameTable}
              deleteTable={this.deleteTable}
            />
          );
        })}
        <tr>
          <td>
            <Button className="fa fa-plus" onClick={this.onAddTable}></Button>
            {this.state.isShowAddTableDialog &&
              <CreateTableDialog
                onAddTable={this.onAddTable}
                createTable={this.createTable}
              />
            }
          </td>
          <td colSpan='4' >{gettext('Add a DTable')}</td>
        </tr>
      </Fragment>
    );
  }
}

Workspace.propTypes = workspacePropTypes;


const contentPropTypes = {
  workspaceList: PropTypes.array.isRequired,
  renameWorkspace: PropTypes.func.isRequired,
  deleteWorkspace: PropTypes.func.isRequired,
};

class Content extends Component {

  render() {
    let workspaceList = this.props.workspaceList;

    return ( 
      <table width="100%" className="table table-hover table-vcenter">
        <colgroup>
          <col width="5%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="30%"/>
          <col width="5%"/>
        </colgroup>
        <tbody>
          {workspaceList.map((workspace, index) => {
            return (
              <Workspace
                key={index}
                workspace={workspace}
                renameWorkspace={this.props.renameWorkspace}
                deleteWorkspace={this.props.deleteWorkspace}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

Content.propTypes = contentPropTypes;


class DTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      workspaceList: [],
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
                <Content
                  workspaceList={this.state.workspaceList}
                  renameWorkspace={this.renameWorkspace}
                  deleteWorkspace={this.deleteWorkspace}
                />
                <br />
                <div>
                  <Button onClick={this.onAddWorkspace} className="fa fa-plus">
                    {gettext('Add a Workspace')}
                  </Button>
                  {this.state.isShowAddWorkspaceDialog &&
                    <CreateWorkspaceDialog
                      createWorkspace={this.createWorkspace}
                      onAddWorkspace={this.onAddWorkspace}
                    />
                  }
                </div>
              </Fragment>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default DTable;

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Button } from 'reactstrap';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, username } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import Loading from '../../components/loading';
import CreateTableDialog from '../../components/dialog/create-table-dialog';
import DeleteTableDialog from '../../components/dialog/delete-table-dialog';
import ShareTableDialog from '../../components/dialog/share-table-dialog';
import ShareTableItem from './list-share-table';
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
};

class Table extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isTableRenaming: false,
      isTableDeleting: false,
      isTableSharing: false,
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

  onShareTableCancel = () => {
    this.setState({isTableSharing: !this.state.isTableSharing});
    this.props.onUnfreezedItem();
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
        <td><span className="sf3-font sf3-font-form"></span></td>
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
        <td>{moment(table.updated_at).fromNow()}</td>
        <td>
          {this.state.active &&
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
                <DropdownItem onClick={this.onShareTableCancel}>{gettext('Share')}</DropdownItem>
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
          {this.state.isTableSharing &&
            <ShareTableDialog
              currentTable={table}
              ShareCancel={this.onShareTableCancel}
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
  setCurrentWorkspace: PropTypes.func.isRequired,
  onAddDTable: PropTypes.func.isRequired,
};

class Workspace extends Component {

  constructor(props) {
    super(props);
    this.state = {
      tableList: this.props.workspace.table_list,
      errorMsg: '',
      isItemFreezed: false,
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
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

  addTable = (e) => {
    e.preventDefault();
    this.props.setCurrentWorkspace(this.props.workspace);
    this.props.onAddDTable();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.workspace.table_list !== this.props.workspace.table_list) {
      this.setState({
        tableList: nextProps.workspace.table_list
      });
    }
  }

  render() {
    let workspace = this.props.workspace;
    let isPersonal = workspace.owner_type === 'Personal';
    let { tableList, isItemFreezed } = this.state;

    return(
      <div className="workspace">
        <div className="table-heading">{isPersonal ? gettext('My Tables') : workspace.owner_name}</div>
        {tableList.length > 0 ?
          <table width="100%" className="table-vcenter">
            <colgroup>
              <col width="4%"/><col width="31%"/><col width="30%"/><col width="27%"/><col width="8%"/>
            </colgroup>
            <tbody>
              {tableList.map((table, index) => {
                return (
                  <Table
                    key={index}
                    table={table}
                    workspaceID={workspace.id}
                    renameTable={this.renameTable}
                    deleteTable={this.deleteTable}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    isItemFreezed={isItemFreezed}
                  />
                );
              })}
              <tr className={isItemFreezed ? '' : 'add-table-range'}>
                <td><span className="sf3-font sf3-font-add"></span></td>
                <td><a href="#" onClick={this.addTable}>{gettext('Add a table')}</a></td>
                <td></td><td></td><td></td>
              </tr>
            </tbody>
          </table>
          :
          <table width="100%" className="table-vcenter">
            <tbody>
              <tr><th className="text-center">{gettext('No tables')}</th></tr>
            </tbody>
          </table>
        }
      </div>
    );
  }
}

Workspace.propTypes = workspacePropTypes;


const dtablePropTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class DTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      shareTableLoading: true,
      errorMsg: '',
      workspaceList: [],
      shareTableList: [],
      isShowAddDTableDialog: false,
      currentWorkspace: null,
    };
  }

  onAddDTable = () => {
    this.setState({ isShowAddDTableDialog: !this.state.isShowAddDTableDialog });
  }

  createDTable = (tableName, owner) => {
    seafileAPI.createTable(tableName, owner).then(() => {
      this.listWorkspaces();
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });
    this.onAddDTable();
  }

  listWorkspaces = () => {
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

  listSharedTables = () => {
    seafileAPI.listSharedTables().then((res) => {
      this.setState({
        shareTableLoading: false,
        shareTableList: res.data.table_list,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          shareTableLoading: false,
          errorMsg: gettext('Error')
        });
      } else {
        this.setState({
          shareTableLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  };

  leaveShareTable = (table) => {
    let email = username;
    let tableName = table.name;
    let workspaceID = table.workspace_id;
    seafileAPI.deleteTableShare(workspaceID, tableName, email).then(() => {
      let shareTableList = this.state.shareTableList.filter(table => {
        return table.name !== tableName;
      });
      this.setState({shareTableList: shareTableList});
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      } else {
        this.setState({
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  };

  setCurrentWorkspace = (currentWorkspace) => {
    this.setState({ currentWorkspace: currentWorkspace });
  }

  componentDidMount() {
    this.listWorkspaces();
    this.listSharedTables();
  }

  renderShareTablePanel = () => {
    return (
      <div className="workspace">
        <div className="table-heading">{gettext('Shared with me')}</div>
        <table width="100%" className="table-vcenter">
          <colgroup>
            <col width="4%"/><col width="31%"/><col width="30%"/><col width="27%"/><col width="8%"/>
          </colgroup>
          <tbody>
            {this.state.shareTableList.map((table, index) => {
              return (
                <ShareTableItem
                  key={index}
                  table={table}
                  leaveShareTable={this.leaveShareTable}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  newDtable = () => {
    if (this.state.currentWorkspace) {
      this.setState({ currentWorkspace: null });
    }
    this.onAddDTable();
  }

  render() {
    let personalWorkspace = this.state.workspaceList.filter(workspace => {
      return workspace.owner_type === 'Personal';
    }).pop();
    let groupWorkspaceList = this.state.workspaceList.filter(workspace => {
      return workspace.owner_type === 'Group';
    });

    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
            <div className="operation">
              <Fragment>
                <MediaQuery query="(min-width: 768px)">
                  <Button className="btn btn-secondary operation-item" onClick={this.newDtable}>{gettext('New DTable')}</Button>
                </MediaQuery>
                <MediaQuery query="(max-width: 767.8px)">
                  <Button className="btn btn-secondary operation-item my-1" onClick={this.newDtable}>{gettext('New DTable')}</Button>
                </MediaQuery>
              </Fragment>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
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
              <Workspace
                workspace={personalWorkspace}
                onAddDTable={this.onAddDTable}
                setCurrentWorkspace={this.setCurrentWorkspace}
              />
              }
              {(!this.state.shareTableLoading && this.state.shareTableList.length > 0) &&
              this.renderShareTablePanel()
              }
              {!this.state.loading &&
                groupWorkspaceList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      onAddDTable={this.onAddDTable}
                      setCurrentWorkspace={this.setCurrentWorkspace}
                    />
                  );
                })
              }
              {(!this.state.loading && this.state.isShowAddDTableDialog) &&
              <div className="my-2">
                <CreateTableDialog
                  createDTable={this.createDTable}
                  onAddDTable={this.onAddDTable}
                  currentWorkspace={this.state.currentWorkspace}
                />
              </div>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

DTable.propTypes = dtablePropTypes;

export default DTable;

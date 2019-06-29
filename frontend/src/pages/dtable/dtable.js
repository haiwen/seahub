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
import LeaveShareTableDialog from '../../components/dialog/leave-share-table-dialog';
import ShareTableDialog from '../../components/dialog/share-table-dialog'
import Rename from '../../components/rename';
import '../../css/dtable-page.css';

moment.locale(window.app.config.lang);


const tablePropTypes = {
  table: PropTypes.object.isRequired,
  workspaceID: PropTypes.number.isRequired,
  renameTable: PropTypes.func.isRequired,
  deleteTable: PropTypes.func.isRequired,
  leaveShareTable: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  fromShare: PropTypes.bool.isRequired,
  fromPersonal: PropTypes.bool.isRequired,
  fromGroup: PropTypes.bool.isRequired,
};

class Table extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isTableRenaming: false,
      isTableDeleting: false,
      isTableSharing: false,
      isTableLeaveSharing: false,
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

  onShareTableCancel = () => {
    this.setState({isTableSharing: !this.state.isTableSharing});
    this.props.onUnfreezedItem();
  }

  onLeaveShareTableCancel = () => {
    this.setState({isTableLeaveSharing: !this.state.isTableLeaveSharing});
    this.props.onUnfreezedItem();
  }

  onDeleteTableSubmit = () => {
    let tableName = this.props.table.name;
    this.props.deleteTable(tableName);
    this.onDeleteTableCancel();
  }

  onLeaveShareTableSubmit = () => {
    let tableName = this.props.table.name;
    this.props.leaveShareTable(tableName);
    this.onLeaveShareTableCancel();
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
    let fromShare = this.props.fromShare;
    let fromPersonal = this.props.fromPersonal;
    let fromGroup = this.props.fromGroup;

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
                {(fromPersonal || fromGroup) &&
                <DropdownItem onClick={this.onRenameTableCancel}>{gettext('Rename')}</DropdownItem>
                }
                {(fromPersonal || fromGroup) &&
                <DropdownItem onClick={this.onDeleteTableCancel}>{gettext('Delete')}</DropdownItem>
                }
                {fromPersonal &&
                <DropdownItem onClick={this.onShareTableCancel}>{gettext('Share')}</DropdownItem>
                }
                {fromShare &&
                <DropdownItem onClick={this.onLeaveShareTableCancel}>{gettext('Leave Share')}</DropdownItem>
                }
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
          {this.state.isTableLeaveSharing &&
            <LeaveShareTableDialog
              currentTable={table}
              leaveShareCancel={this.onLeaveShareTableCancel}
              handleSubmit={this.onLeaveShareTableSubmit}
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
  fromShare: PropTypes.bool.isRequired,
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

  leaveShareTable = (tableName) => {
    let email = username;
    let workspaceID = this.props.workspace.id;
    seafileAPI.deleteShareTable(workspaceID, tableName, email).then(() => {
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

  componentWillReceiveProps(nextProps) {
    if (nextProps.workspace.table_list !== this.props.workspace.table_list) {
      this.setState({
        tableList: nextProps.workspace.table_list
      });
    }
  }

  render() {
    let workspace = this.props.workspace;
    let fromShare = this.props.fromShare;
    let fromPersonal = !fromShare && workspace.owner_type === 'Personal';
    let fromGroup = !fromShare && workspace.owner_type === 'Group';

    return(
      <div className="workspace my-2">
        {fromPersonal ?
          <div>{gettext('My Tables')}</div> :
          <div>{workspace.owner_name}</div>
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
                  leaveShareTable={this.leaveShareTable}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  isItemFreezed={this.state.isItemFreezed}
                  fromShare={fromShare}
                  fromPersonal={fromPersonal}
                  fromGroup={fromGroup}
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
    };
  }

  onAddDTable = () => {
    this.setState({
      isShowAddDTableDialog: !this.state.isShowAddDTableDialog,
    });
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

  listShareTable = () => {
    seafileAPI.listShareTable().then((res) => {
      this.setState({
        shareTableLoading: false,
        shareTableList: res.data.share_list,
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
  };

  componentDidMount() {
    this.listWorkspaces();
    this.listShareTable();
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
                  <Button className="btn btn-secondary operation-item" onClick={this.onAddDTable}>{gettext('New DTable')}</Button>
                </MediaQuery>
                <MediaQuery query="(max-width: 767.8px)">
                  <Button className="btn btn-secondary operation-item my-1" onClick={this.onAddDTable}>{gettext('New DTable')}</Button>
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
                fromShare={false}
              />
              }
              {(!this.state.shareTableLoading && this.state.shareTableList.length > 0) &&
              <Fragment>
                <div className="sf-heading">{gettext('Shared with me')}</div>
                {this.state.shareTableList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      fromShare={true}
                    />
                  );})
                }
              </Fragment>
              }
              {(!this.state.loading && groupWorkspaceList.length > 0) &&
              <Fragment>
                <div className="sf-heading">{gettext('Shared with groups')}</div>
                {groupWorkspaceList.map((workspace, index) => {
                  return (
                    <Workspace
                      key={index}
                      workspace={workspace}
                      fromShare={false}
                    />
                  );
                })}
              </Fragment>
              }
              {(!this.state.loading && this.state.isShowAddDTableDialog) &&
              <div className="my-2">
                <CreateTableDialog
                  createDTable={this.createDTable}
                  onAddDTable={this.onAddDTable}
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

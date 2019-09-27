import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../../components/loading';
import DTableItemCommon from './dtable-item-common';
import CreateTableDialog from '../../components/dialog/create-table-dialog';
import DeleteTableDialog from '../../components/dialog/delete-table-dialog';
import ShareTableDialog from '../../components/dialog/share-table-dialog';
import TableAPITokenDialog from '../../components/dialog/table-api-token-dialog';

const gettext = window.gettext;

const propTypes = {
  workspace: PropTypes.object.isRequired,
};

class DTableWorkspaceCommon extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tableList: [],
      isDataLoading: true,
      isItemFreezed: false,
      isShowCreateDialog: false,
      isShowDeleteDialog: false,
      isShowSharedDialog: false,
      isShowAPITokenDialog: false,
      currentTable: null,
    };
  }

  componentDidMount() {
    let workspace = this.props.workspace;
    let tableList = workspace.table_list;
    this.setState({
      tableList: tableList,
      isDataLoading: false,
    });
  }
  
  componentWillReceiveProps(nextProps) {
    if (nextProps.workspace !== this.props.workspace) {
      let workspace = nextProps.workspace;
      let tableList = workspace.table_list;
      this.setState({tableList: tableList});
    }
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onCreateTableToggle = () => {
    this.setState({isShowCreateDialog: !this.state.isShowCreateDialog});
  }

  onDeleteTableToggle = (table) => {
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
      currentTable: table
    });
    this.onUnfreezedItem();
  }

  onDeleteTableSubmit = () => {
    let tableName = this.state.currentTable.name;
    this.deleteTable(tableName);
    this.onDeleteTableToggle();
  }
  
  onShareTableToggle = (table) => {
    this.setState({
      isShowSharedDialog: !this.state.isShowSharedDialog,
      currentTable: table
    });
    this.onUnfreezedItem();
  }

  onTableAPITokenToggle = (table) => {
    this.setState({
      isShowAPITokenDialog: !this.state.isShowAPITokenDialog,
      currentTable: table
    });
    this.onUnfreezedItem();
  }

  onCreateTable = (tableName, owner) => {
    seafileAPI.createTable(tableName, owner).then((res) => {
      this.state.tableList.push(res.data.table);
      this.setState({
        tableList: this.state.tableList
      });
    }).catch((error) => {
      if(error.response) {
        this.setState({errorMsg: gettext('Error')});
      }
    });

    this.onCreateTableToggle();
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

  render() {
    let { isDataLoading } = this.state;
    if (isDataLoading) {
      return <Loading />;
    }

    let { workspace } = this.props;
    let { tableList, isItemFreezed } = this.state;
    let isPersonal = workspace.owner_type === 'Personal';

    return (
      <Fragment>
        <div className="workspace">
          <div className="table-heading">{isPersonal ? gettext('My Tables') : workspace.owner_name}</div>
          <div className="table-item-container">
            {tableList.map((table, index) => {
              return (
                <DTableItemCommon
                  key={index}
                  table={table}
                  isItemFreezed={isItemFreezed}
                  renameTable={this.renameTable}
                  onShareTableToggle={this.onShareTableToggle}
                  onDeleteTableToggle={this.onDeleteTableToggle}
                  onTableAPITokenToggle={this.onTableAPITokenToggle}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />
              );
            })}
            <div className={`table-item ${isItemFreezed ? '' : 'add-table-range'}`}>
              <div className="table-icon"><span className="sf3-font sf3-font-add"></span></div>
              <div className="table-name"><a href="#" onClick={this.onCreateTableToggle}>{gettext('Add a table')}</a></div>
              <div className="table-dropdown-menu"></div>
            </div>
          </div>
        </div>
        {this.state.isShowCreateDialog && (
          <CreateTableDialog
            createDTable={this.onCreateTable}
            onAddDTable={this.onCreateTableToggle}
            currentWorkspace={this.props.workspace}
          />
        )}
        {this.state.isShowDeleteDialog && (
          <DeleteTableDialog 
            currentTable={this.state.currentTable} 
            deleteCancel={this.onDeleteTableToggle} 
            handleSubmit={this.onDeleteTableSubmit} 
          />
        )}
        {this.state.isShowSharedDialog &&
          <ShareTableDialog 
            currentTable={this.state.currentTable} 
            ShareCancel={this.onShareTableToggle} 
          />
        }
        {this.state.isShowAPITokenDialog &&
          <TableAPITokenDialog
            currentTable={this.state.currentTable}
            onTableAPITokenToggle={this.onTableAPITokenToggle}
          />
        }
      </Fragment>
    );
  }
}


DTableWorkspaceCommon.propTypes = propTypes;

export default DTableWorkspaceCommon;

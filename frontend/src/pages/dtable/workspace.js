import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import ListTableItem from './list-table-item';

const propTypes = {
  workspace: PropTypes.object.isRequired,
  setCurrentWorkspace: PropTypes.func.isRequired,
  onAddDTable: PropTypes.func.isRequired,
};

class Workspace extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tableList: props.workspace.table_list,
      errorMsg: '',
      isItemFreezed: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.workspace.table_list !== this.props.workspace.table_list) {
      this.setState({
        tableList: nextProps.workspace.table_list
      });
    }
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

  render() {
    let workspace = this.props.workspace;
    let isPersonal = workspace.owner_type === 'Personal';
    let { tableList, isItemFreezed } = this.state;

    return(
      <div className="workspace">
        <div className={`table-heading ${tableList.length > 0 ? '' : 'table-heading-border'}`}>{isPersonal ? gettext('My Tables') : workspace.owner_name}</div>
        {tableList.length > 0 ?
          <div className="table-item-container">
            {tableList.map((table, index) => {
              return (
                <ListTableItem
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
            <div className={`table-item ${isItemFreezed ? '' : 'add-table-range'}`}>
              <div className="table-icon"><span className="sf3-font sf3-font-add"></span></div>
              <div className="table-name"><a href="#" onClick={this.addTable}>{gettext('Add a table')}</a></div>
              <div className="table-dropdown-menu"></div>
            </div>
          </div>
          :
          <table width="100%" className="table-vcenter">
            <tbody>
              <tr><th className="text-center">{gettext('No Tables')}</th></tr>
            </tbody>
          </table>
        }
      </div>
    );
  }
 
}

Workspace.propTypes = propTypes;

export default Workspace;
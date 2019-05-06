import React from 'react';
import PropTypes from 'prop-types';
import ReactDataGrid from '@seafile/react-data-grid/';
import update from 'immutability-helper';
import { Menu, Editors } from '@seafile/react-data-grid-addons';
import GridHeaderContextMenu from './grid-header-contextmenu';
import GridContentContextMenu from './grid-content-contextmenu';
import ModalPortal from '../../components/modal-portal';
import NewColumnDialog from './new-column-dialog';
import DTableStore from './store/DTableStore';

const propTypes = {
  initData: PropTypes.object.isRequired,
};

class AppMain extends React.Component {

  constructor(props, context) {
    super(props, context);
    this._columns = [
      {
        key: 'name',
        name: 'Name',
        width: 80,
        editable: true,
        resizable: true
      }
    ];
    
    let initData = props.initData;
    
    this.state = {
      columns: initData.columns.length ? this.deseralizeGridData(initData.columns) : this._columns,
      rows: initData.rows.length ? initData.rows : this.createRows(1),
      isNewColumnDialogShow: false,
    };

    this.dTableStore = new DTableStore(initData);
  }

  componentWillReceiveProps(nextProps) {
    let data = nextProps.initData;
    this.deseralizeGridData(data);
  }

  createRows = (numberOfRows) => {
    let rows = [];
    for (let i = 0; i < numberOfRows; i++) {
      rows[i] = this.createFakeRowObjectData(i);
    }
    return rows;
  };

  createFakeRowObjectData = (index) => {
    return {name: 'name_' + index};
  };

  getColumns = () => {
    let clonedColumns = this.state.columns.slice();
    return clonedColumns;
  };

  handleGridRowsUpdated = ({ fromRow, toRow, updated }) => {
    let rows = this.state.rows.slice();

    for (let i = fromRow; i <= toRow; i++) {
      let rowToUpdate = rows[i];
      let updatedRow = update(rowToUpdate, {$merge: updated});
      rows[i] = updatedRow;
    }

    this.setState({ rows });
  };

  handleAddRow = ({ newRowIndex }) => {
    const newRow = {
      name: 'name_' + newRowIndex,
    };

    let rows = this.state.rows.slice();
    rows = update(rows, {$push: [newRow]});
    this.setState({ rows });
  };

  getRowAt = (index) => {
    if (index < 0 || index > this.getSize()) {
      return undefined;
    }

    return this.state.rows[index];
  };

  getSize = () => {
    return this.state.rows.length;
  };

  onInsertRow = () => {
    let newRowIndex = this.getSize();
    let rows = this.dTableStore.insertRow(newRowIndex);
    this.setState({rows});
  }

  onInsertColumn = () => {
    this.setState({isNewColumnDialogShow: true});
  }

  onNewColumn = (columnName, columnType) => {
    let idx = this.state.columns.length;
    let columns = this.dTableStore.insertColumn(idx, columnName, columnType);
    columns = this.formatColumnsData(columns);
    this.setState({columns: columns});
    this.onNewColumnCancel();
  }

  onNewColumnCancel = () => {
    this.setState({isNewColumnDialogShow: false});
  }

  onRowDelete = (e, data) => {
    let { rowIdx } = data;
    let rows = this.dTableStore.deleteRow(rowIdx);
    this.setState({rows});
  }

  onColumnDelete = (e, data) => {
    let column = data.column;
    let idx = column.idx - 1;
    let columns = this.dTableStore.deleteColumn(idx);
    this.setState({columns});
  }

  serializeGridData = () => {
    let gridData = {
      columns: JSON.stringify(this.state.columns),
      rows: JSON.stringify(this.state.rows),
    };
    return gridData;
  }

  deseralizeGridData = (data) => {
    let columns = JSON.parse(data.columns);
    let rows = JSON.parse(data.rows);
    columns = this.formatColumnsData(columns);
    this.setState({
      columns: columns,
      rows: rows,
    });

    this.dTableStore.updateStoreValues({columns, rows});
  }

  formatColumnsData = (columns) => {
    return columns.map(column => {
      if (column.editor) {
        let editor = this.createEditor(column.editor);
        column.editor = editor;
      }
      return column;
    });
  }

  createEditor = (editorType) => {
    let editor = null;
    switch (editorType) {
      case 'number': 
        editor = <Editors.NumberEditor />; 
        break;
      case 'text':
        editor = null;
        break;
      default:
        break;
    }

    return editor;
  }

  render() {
    let columns = this.getColumns();
    return (
      <div id="main">
        <ReactDataGrid
          ref={ node => this.grid = node }
          enableCellSelect={true}
          columns={columns}
          rowGetter={this.getRowAt}
          rowsCount={this.getSize()}
          onGridRowsUpdated={this.handleGridRowsUpdated}
          enableRowSelect={true}
          rowHeight={50}
          minHeight={500}
          rowScrollTimeout={200}
          enableInsertColumn={true}
          enableInsertRow={true}
          onInsertRow={this.onInsertRow}
          onInsertColumn={this.onInsertColumn}
          RowsContainer={Menu.ContextMenuTrigger}
          headerContextMenu={<GridHeaderContextMenu id="grid-header-contxtmenu" onColumnDelete={this.onColumnDelete} />}
          contextMenu={<GridContentContextMenu id="grid-content-contxtmenu" onRowDelete={this.onRowDelete} />}
        />
        {this.state.isNewColumnDialogShow && (
          <ModalPortal>
            <NewColumnDialog 
              onNewColumnCancel={this.onNewColumnCancel}
              onNewColumn={this.onNewColumn}
            />
          </ModalPortal>
        )}
      </div>
    );
  }
}

AppMain.propTypes = propTypes;

export default AppMain;

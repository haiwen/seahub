import React from 'react';
import PropTypes from 'prop-types';
import ReactDataGrid from '@seafile/react-data-grid/dist/react-data-grid';
import update from 'immutability-helper';

const propTypes = {
  initData: PropTypes.object.isRequired,
};

class AppMain extends React.Component {

  constructor(props, context) {
    super(props, context);
    this._columns = [
      {
        key: 'id',
        name: 'ID',
        width: 80,
        resizable: true
      }
    ];

    let initData = props.initData;

    this.state = {
      columns: initData.columns.length ? initData.columns : this._columns,
      rows: initData.rows.length ? initData.rows : this.createRows(1)
    };
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
    return {id: 'id_' + index};
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
      id: 'id_' + newRowIndex,
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
    this.handleAddRow({ newRowIndex });
  }

  onInsertColumn = () => {
    var name = window.prompt('Place enter a column name', '');
    if (!name || name.trim() === '') {
      return;
    }
    let newColumn = {
      key: name,
      name: name,
      editable: true,
      width: 200,
      resizable: true
    };
    let columns = this.state.columns.slice();
    columns.push(newColumn);
    this.setState({columns: columns});
  }

  serializeGridData = () => {
    let gridData = {
      columns: JSON.stringify(this.state.columns),
      rows: JSON.stringify(this.state.rows),
    };
    return gridData;
  }

  deseralizeGridData = (data) => {
    let columns = data.columns;
    let rows = data.rows;
    this.setState({
      columns: JSON.parse(columns),
      rows: JSON.parse(rows),
    });
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
          minHeight={600}
          rowScrollTimeout={200}
          enableInsertColumn={true}
          enableInsertRow={true}
          onInsertRow={this.onInsertRow}
          onInsertColumn={this.onInsertColumn}
        />
      </div>
    );
  }
}

AppMain.propTypes = propTypes;

export default AppMain;

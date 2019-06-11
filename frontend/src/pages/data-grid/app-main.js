import React from 'react';
import isHotkey from 'is-hotkey';
import ReactDataGrid from '@seafile/react-data-grid/';
import { Menu } from '@seafile/react-data-grid-addons';
import { seafileAPI } from '../../utils/seafile-api';
import ModalPortal from '../../components/modal-portal';
import NewColumnDialog from './new-column-dialog';
import GridHeaderContextMenu from './grid-header-contextmenu';
import GridContentContextMenu from './grid-content-contextmenu';
import DTableStore from './store/dtable-store';

const { workspaceID, fileName } = window.app.pageOptions;

const DEFAULT_DATA = {
  columns:  [
    {
      key: 'name',
      name: 'Name',
      type: '',
      width: 80,
      editable: true,
      resizable: true
    }
  ],
  rows:  [{name: 'name_' + 0}]
};

class AppMain extends React.Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      value: null,
      isNewColumnDialogShow: false,
    };
    this.dTableStore = new DTableStore();
  }

  componentDidMount() {

    seafileAPI.getTableDownloadLink(workspaceID, fileName).then(res => {
      let url = res.data;
      seafileAPI.getFileContent(url).then(res => {
        let data = res.data ? res.data : JSON.stringify(DEFAULT_DATA);
        let value = this.dTableStore.deseralizeGridData(data);
        this.setState({value});
      });
    });

    document.addEventListener('keydown', this.onHotKey);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onHotKey);
  }

  getRowAt = (index) => {
    if (index < 0 || index > this.getSize()) {
      return undefined;
    }

    return this.state.value.rows[index];
  };

  getSize = () => {
    return this.state.value.rows.length;
  };

  onInsertRow = () => {

    let newRowIndex = this.getSize();
    let value = this.dTableStore.insertRow(newRowIndex);
    this.setState({value});

    this.props.onContentChanged();
  }

  onInsertColumn = () => {
    this.setState({isNewColumnDialogShow: true});
  }

  onNewColumn = (columnName, columnType) => {

    let idx = this.state.value.columns.length;
    let value = this.dTableStore.insertColumn(idx, columnName, columnType);
    this.setState({value});
    this.onNewColumnCancel();

    this.props.onContentChanged();
  }

  onNewColumnCancel = () => {
    this.setState({isNewColumnDialogShow: false});

    this.props.onContentChanged();
  }

  onRowDelete = (e, data) => {

    let { rowIdx } = data;
    let value = this.dTableStore.deleteRow(rowIdx);
    this.setState({value});

    this.props.onContentChanged();
  }

  onColumnDelete = (e, data) => {

    let column = data.column;
    let idx = column.idx - 1;
    let value = this.dTableStore.deleteColumn(idx);
    this.setState({value});

    this.props.onContentChanged();
  }

  onColumnResize = (index, width) => {
    
    let idx = index - 1;
    let value = this.dTableStore.resizeColumn(idx, width);
    this.setState({value});

    this.props.onContentChanged();
  }

  handleGridRowsUpdated = ({fromRow, updated}) => {
    let rowIdx = fromRow;
    let value = this.dTableStore.modifyCell(rowIdx, updated);
    this.setState({value});

    this.props.onContentChanged();
  }

  serializeGridData = () => {
    return this.dTableStore.serializeGridData();
  }

  onHotKey = (event) => {
    if (isHotkey('mod+s', event)) {
      event.preventDefault();
      this.props.onSave();
      return true;
    }
  }
  
  render() {

    if (!this.state.value) {
      return '';
    }

    return (
      <div id="main">
        <ReactDataGrid
          ref={ node => this.grid = node }
          enableCellSelect={true}
          columns={this.state.value.columns}
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
          onColumnResize={this.onColumnResize}
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

export default AppMain;

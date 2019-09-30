import React from 'react';
import PropTypes from 'prop-types';
import RowItem from './row-item';

const propTypes = {
  row: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
};

class AppMain extends React.Component {

  static defaultProps = {
    mode: 'form_mode',
  }

  renderRowItems = () => {
    let { row, columns } = this.props;
    let rows = [];
    for (let key in row) {
      if (key === '_id') {
        continue;
      }
      let column = columns.find(column => { return column.key === key });
      if (column.type !== 'number' && column.type !== 'text' && column.type !== 'date') {
        continue;
      }
      let value = row[key];
      let rowItem = <RowItem value={value} column={column}/>
      rows.push(rowItem);
    }
    return rows;
  }

  render() {
    return (
      <div className="app-main">
        <div className={`${this.props.mode} dtable-share-row-container`}>
          {this.renderRowItems()}
        </div>
      </div>
    );
  }
}

AppMain.propTypes = propTypes;

export default AppMain;

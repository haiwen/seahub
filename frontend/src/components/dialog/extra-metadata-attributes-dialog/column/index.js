import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col } from 'reactstrap';
import ColumnName from './column-name';
import CONFIG from '../editor';

import './index.css';

class Column extends Component {
  render() {
    const { column, row, columns } = this.props;
    const Editor = CONFIG[column.type] || CONFIG['text'];

    return (
      <div className="pb-4 row column-item">
        <ColumnName column={column} />
        <Col md={9} className='d-flex align-items-center extra-attribute-item-info'>
          <Editor
            column={column}
            row={row}
            columns={columns}
            onCommit={this.props.onCommit}
          />
        </Col>
      </div>
    );
  }
}

Column.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
  columns: PropTypes.array,
  onCommit: PropTypes.func,
};

export default Column;

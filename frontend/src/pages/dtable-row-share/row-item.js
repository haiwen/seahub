import React from 'react';
import PropTypes from 'prop-types';
import CellLabel from './cell-label';
import FormatterConfig from './cell-formatter/index';
import './css/row-item.css';

const propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array, PropTypes.bool, PropTypes.number, PropTypes.object]),
  column: PropTypes.array.isRequired,
};

class RowItem extends React.Component {

  getCellFormatter = () => {
    let type = this.props.column.type;
    return FormatterConfig[type]
  }

  render() {
    let { value, column } = this.props;
    let CellFormatter = this.getCellFormatter();
    return (
      <div className="share-row-item">
        <CellLabel column={column} />
        {CellFormatter && React.cloneElement(CellFormatter, { value, column })}
      </div>
    );
  }
}

RowItem.propTypes = propTypes;

export default RowItem;

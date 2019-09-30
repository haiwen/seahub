import React from 'react';
import PropTypes from 'prop-types';
import NumberUtils from '../value-utils/number-utils';

const propTypes = {
  mode: PropTypes.oneOfType(['grid_mode', 'form_mode', 'grally_mode', 'calender_mode', 'kanban_mode']),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  column: PropTypes.object,
};


const DEFAULT_FORMATTER = 'number';

class NumberFormatter extends React.Component {

  formatValue = () => {
    let { value, column } = this.props;
    if (value !== '') {
      let formatType = (column.data && column.data.format) ? column.data.format : DEFAULT_FORMATTER;
      value = NumberUtils.formatValue(value, formatType);
    }
    return value;
  }

  render() {
    return (
      <div className={`${this.props.mode} cell-formatter grid-cell-type-number`}></div>
    );
  }
}

NumberFormatter.propTypes = propTypes;

export default NumberFormatter;

import React from 'react';
import PropTypes from 'prop-types';
import { formatNumberValue } from '../utils/utils';
import '../css/number.css'

const propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  column: PropTypes.object,
};


const DEFAULT_FORMATTER = 'number';

class NumberFormatter extends React.Component {

  getValue = () => {
    let { value, column } = this.props;
    if (value !== '') {
      let formatType = (column.data && column.data.format) ? column.data.format : DEFAULT_FORMATTER;
      value = formatNumberValue(value, formatType);
    }
    return value;
  }

  render() {
    return (
      <div className="cell-formatter grid-cell-type-number">{this.getValue()}</div>
    );
  }
}

NumberFormatter.propTypes = propTypes;

export default NumberFormatter;

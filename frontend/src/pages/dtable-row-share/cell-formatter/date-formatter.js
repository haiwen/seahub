import React from 'react';
import PropTypes from 'prop-types';
import { formatDateValue } from '../utils/utils'

const propTypes = {
  value: PropTypes.string,
  column: PropTypes.object,
};

const DEFAULT_FORMAT = 'YYYY-MM-DD';

class DataFormatter extends React.Component {

  getValue = () => {
    let { value, column } = this.props;
    let format = (column.data && column.data.format) ? column.data.format : DEFAULT_FORMAT;
    return formatDateValue(value, format);
  }

  render() {
    return (
      <div className="cell-formatter grid-cell-type-date">{this.getValue()}</div>
    );
  }
}

DataFormatter.propTypes = propTypes;

export default DataFormatter;

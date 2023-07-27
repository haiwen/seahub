import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getDateDisplayString } from '../../../../utils/extra-attributes';


class DateEditor extends Component {
  render() {
    const { column, row } = this.props;
    const { data, key } = column;
    const value = getDateDisplayString(row[key], data ? data.format : '');

    return (
      <input
        type="text"
        className="form-control"
        value={value}
        disabled={true}
      />
    );
  }
}

DateEditor.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
};

export default DateEditor;

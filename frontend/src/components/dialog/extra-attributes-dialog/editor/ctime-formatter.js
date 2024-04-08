import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getDateDisplayString } from '../../../../utils/extra-attributes';

class CtimeFormatter extends Component {
  render() {
    const { column, row } = this.props;
    const { key } = column;
    const value = getDateDisplayString(row[key], 'YYYY-MM-DD HH:mm:ss') || '';

    return (
      <div className="form-control" style={{ width: 320 }}>{value}</div>
    );
  }
}

CtimeFormatter.propTypes = {
  column: PropTypes.object,
  row: PropTypes.object,
};

export default CtimeFormatter;

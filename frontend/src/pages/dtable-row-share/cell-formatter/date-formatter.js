import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.string,
  column: PropTypes.object,
};

class DataFormatter extends React.Component {

  getValue = () => {
    let { value, column } = this.props;
  }

  render() {
    return (
      <input className="cell-formatter grid-cell-type-date" value={this.props.value} readOnly />
    );
  }
}

DataFormatter.propTypes = propTypes;

export default DataFormatter;

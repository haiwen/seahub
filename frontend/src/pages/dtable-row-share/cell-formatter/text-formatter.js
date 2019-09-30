import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.string,
  column: PropTypes.object,
};

class TextFormatter extends React.Component {

  render() {
    return (
      <div className="cell-formatter grid-cell-type-text">{this.props.value}</div>
    );
  }
}

TextFormatter.propTypes = propTypes;

export default TextFormatter;

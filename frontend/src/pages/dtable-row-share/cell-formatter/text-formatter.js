import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  value: PropTypes.string,
  column: PropTypes.object,
};

class TextFormatter extends React.Component {

  render() {
    return (
      <input className="cell-formatter grid-cell-type-text" value={this.props.value} readOnly />
    );
  }
}

TextFormatter.propTypes = propTypes;

export default TextFormatter;

import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  title: PropTypes.string.isRequired,
  className: PropTypes.string,
};

class StyledTitle extends React.Component {

  static defaultProps = {
    className: '',
  }

  render() {
    const { title } = this.props;
    const className = `op-target ellipsis ellipsis-op-target ${className}`
    return (
      <span className={className}>{title}{' '}</span>
    );
  }
}

StyledTitle.propTypes = propTypes;

export default StyledTitle;

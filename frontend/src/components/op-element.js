import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';

const propTypes = {
  className: PropTypes.string.isRequired,
  op: PropTypes.func,
  title: PropTypes.string.isRequired,
  children: PropTypes.object
};

class OpElement extends React.Component {

  render() {
    const { className, op, title, children } = this.props;
    return (
      <span
        tabIndex="0"
        role="button"
        className={className}
        title={title}
        aria-label={title}
        onClick={op}
        onKeyDown={Utils.onKeyDown}
      >
        {children}
      </span>
    );
  }
}

OpElement.propTypes = propTypes;

export default OpElement;

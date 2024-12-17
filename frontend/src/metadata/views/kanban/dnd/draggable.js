import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { constants } from 'smooth-dnd';

const { wrapperClass } = constants;

class Draggable extends Component {
  static propTypes = {
    render: PropTypes.func,
    className: PropTypes.string,
    children: PropTypes.node,
  };

  render() {
    const { render, className, children, ...restProps } = this.props;

    if (render) {
      return React.cloneElement(render(), { className: wrapperClass });
    }

    const clsName = `${className ? className + ' ' : ''}${wrapperClass}`;
    return (
      <div {...restProps} className={clsName}>
        {children}
      </div>
    );
  }
}

export default Draggable;

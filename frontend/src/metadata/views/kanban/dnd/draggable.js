import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { constants } from '../../../third-party/trello-smooth-dnd';

const { wrapperClass } = constants;

class Draggable extends Component {

  render() {
    const { render, className, children, ...restProps } = this.props;

    if (render) {
      return React.cloneElement(render(), { className: wrapperClass });
    }

    return (
      <div {...restProps} className={classnames(className, wrapperClass)}>
        {children}
      </div>
    );
  }
}

Draggable.propTypes = {
  className: PropTypes.string,
  children: PropTypes.element,
  render: PropTypes.func
};

export default Draggable;

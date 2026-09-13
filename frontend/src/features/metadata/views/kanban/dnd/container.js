/* eslint-disable react/prop-types */
import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import container, { dropHandlers } from '../../../third-party/trello-smooth-dnd';

container.dropHandler = dropHandlers.reactDropHandler().handler;
container.wrapChild = false;

class Container extends Component {

  constructor(props) {
    super(props);
    this.containerRef = createRef();
    this.prevContainer = null;
    this.container = null;
  }

  componentDidMount() {
    this.prevContainer = this.getContainer();
    this.container = container(this.getContainer(), this.getContainerOptions());
  }

  componentWillUnmount() {
    if (this.container) {
      this.container.dispose();
      this.container = null;
    }
  }

  componentDidUpdate(prevProps) {
    if (this.getContainer()) {
      if (this.prevContainer && this.prevContainer !== this.getContainer()) {
        this.container.dispose();
        this.container = container(this.getContainer(), this.getContainerOptions());
        this.prevContainer = this.getContainer();
        return;
      }

      if (this.isObjectTypePropsChanged(prevProps)) {
        this.container.setOptions(this.getContainerOptions());
      }
    }
  }

  isObjectTypePropsChanged(prevProps) {
    const { render, children, style, ...containerOptions } = this.props;

    for (const key in containerOptions) {
      if (containerOptions.hasOwnProperty(key)) {
        const prop = containerOptions[key];

        if (typeof prop !== 'function' && prop !== prevProps[key]) {
          return true;
        }
      }
    }

    return false;
  }

  getContainer() {
    return this.containerRef.current;
  }

  getContainerOptions() {
    return Object.keys(this.props).reduce((result, key) => {
      const optionName = key;
      const prop = this.props[optionName];

      if (typeof prop === 'function') {
        result[optionName] = (...params) => {
          return prop(...params);
        };
      } else {
        result[optionName] = prop;
      }

      return result;
    }, {});
  }

  render() {
    if (this.props.render) {
      return this.props.render(this.containerRef);
    }
    return (
      <div style={this.props.style} ref={this.containerRef}>
        {this.props.children}
      </div>
    );
  }
}

Container.propTypes = {
  behaviour: PropTypes.oneOf(['move', 'copy', 'drop-zone', 'contain']),
  groupName: PropTypes.string,
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  style: PropTypes.object,
  dragHandleSelector: PropTypes.string,
  nonDragAreaSelector: PropTypes.string,
  dragBeginDelay: PropTypes.number,
  animationDuration: PropTypes.number,
  autoScrollEnabled: PropTypes.bool,
  lockAxis: PropTypes.string,
  dragClass: PropTypes.string,
  dropClass: PropTypes.string,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  onDrop: PropTypes.func,
  getChildPayload: PropTypes.func,
  shouldAnimateDrop: PropTypes.func,
  shouldAcceptDrop: PropTypes.func,
  onDragEnter: PropTypes.func,
  onDragLeave: PropTypes.func,
  render: PropTypes.func,
  getGhostParent: PropTypes.func,
  removeOnDropOut: PropTypes.bool,
  dropPlaceholder: PropTypes.oneOfType([
    PropTypes.shape({
      className: PropTypes.string,
      animationDuration: PropTypes.number,
      showOnTop: PropTypes.bool,
    }),
    PropTypes.bool,
  ]),
};

export default Container;

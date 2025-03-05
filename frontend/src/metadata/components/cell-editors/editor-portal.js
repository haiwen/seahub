import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

class EditorPortal extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    target: PropTypes.instanceOf(Element).isRequired
  };

  // Keep track of when the modal element is added to the DOM
  state = {
    isMounted: false
  };

  el = document.createElement('div');

  componentDidMount() {
    this.props.target.appendChild(this.el);
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({ isMounted: true });
  }

  componentWillUnmount() {
    this.props.target.removeChild(this.el);
  }

  render() {
    // Don't render the portal until the component has mounted,
    // So the portal can safely access the DOM.
    if (!this.state.isMounted) {
      return null;
    }

    return createPortal(
      this.props.children,
      this.el,
    );
  }
}

export default EditorPortal;

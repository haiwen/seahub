import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.any.isRequired,
};

const modalRoot = document.getElementById('modal-wrapper');
class ModalPortal extends React.Component {

  constructor(props) {
    super(props);
    this.el = document.createElement('div');
  }

  componentDidMount() {
    modalRoot.appendChild(this.el);
  }

  componentWillUnmount() {
    modalRoot.removeChild(this.el);
  }

  render() {
    return createPortal(
      this.props.children,
      this.el,
    );
  }
}

ModalPortal.propTypes = propTypes;

export default ModalPortal;

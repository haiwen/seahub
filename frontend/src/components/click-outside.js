import React from 'react';
import PropTypes from 'prop-types';

class ClickOutside extends React.Component {

  isClickedInside = false;

  componentDidMount() {
    document.addEventListener('mousedown', this.handleDocumentClick);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleDocumentClick);
  }

  handleDocumentClick = (e) => {
    if (this.isClickedInside) {
      this.isClickedInside = false;
      return;
    }

    this.props.onClickOutside(e);
  };

  handleMouseDown = () => {
    this.isClickedInside = true;
  };

  render() {
    return React.cloneElement(
      React.Children.only(this.props.children), {
        onMouseDownCapture: this.handleMouseDown
      }
    );
  }
}

ClickOutside.propTypes = {
  children: PropTypes.element.isRequired,
  onClickOutside: PropTypes.func.isRequired,
};

export default ClickOutside;

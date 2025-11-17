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

  setClickedInsideStatus = (status) => {
    this.isClickedInside = status || false;
  };

  handleDocumentClick = (e) => {
    if (this.isClickedInside) {
      this.setClickedInsideStatus(false);
      return;
    }

    this.props.onClickOutside(e);
  };

  handleMouseDown = () => {
    this.setClickedInsideStatus(true);
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

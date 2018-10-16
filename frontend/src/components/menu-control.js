import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  isShow: PropTypes.bool.isRequired,
};

class MenuControl extends React.Component {
 
  render() {
    return (
      <i className={`fas fa-ellipsis-v ${this.props.isShow ? '' : 'hide'}`} onClick={this.props.onClick}></i>
    );
  }
}

MenuControl.propTypes = propTypes;

export default MenuControl;
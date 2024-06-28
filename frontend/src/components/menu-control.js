import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  isShow: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

class MenuControl extends React.Component {

  render() {
    return (
      <i className={`sf3-font sf3-font-more-vertical ${this.props.isShow ? '' : 'invisible'}`} onClick={this.props.onClick}></i>
    );
  }
}

MenuControl.propTypes = propTypes;

export default MenuControl;

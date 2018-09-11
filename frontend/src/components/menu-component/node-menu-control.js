import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  isShow: PropTypes.bool.isRequired,
  currentNode: PropTypes.object,
  onClick: PropTypes.func.isRequired,
};

class NodeMenuControl extends React.Component {

  onClick = (e) => {
    let node = this.props.currentNode;
    this.props.onClick(e, node);
  }
  
  render() {
    return (
      <i 
        className={`fas fa-ellipsis-v ${this.props.isShow ? '' : 'hide'}`}
        onClick={this.onClick}
      >
      </i>
    );
  }
}

NodeMenuControl.propTypes = propTypes;

export default NodeMenuControl;
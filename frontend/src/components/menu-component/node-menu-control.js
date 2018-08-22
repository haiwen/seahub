import React from 'react';

class NodeMenuControl extends React.Component {

  onClick = (e) => {
    let node = this.props.currentNode;
    this.props.onClick(e, node);
  }
  
  render() {
    return (
      <i 
        className={`fas fa-ellipsis-v ${this.props.isShow ? "" : "hide"}`}
        onClick={this.onClick}
      >
      </i>
    )
  }
}

export default NodeMenuControl;
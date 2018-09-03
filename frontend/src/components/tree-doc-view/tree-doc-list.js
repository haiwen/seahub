import React, { Component } from 'react';

class TreeDocList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMourseEnter: false
    }
  }

  onMainNodeClick = () => {
    this.props.onMainNodeClick(this.props.node);
  }

  render() {
    let node = this.props.node;
    return (
      <tr className='row' onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="dirent-icon" style={{width: "24px"}}>
          <img src={node.type === "dir" ? "/media/img/folder-192.png" : "/media/img/file/192/txt.png"}></img>
        </td>
        <td className="col-md-7">
          <a className="custom-link" onClick={this.onMainNodeClick}>{node.name}</a>
        </td>
        <td className="col-md-2">{node.size}</td>
        <td className="col-md-2" title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    )
  }
}

export default TreeDocList;
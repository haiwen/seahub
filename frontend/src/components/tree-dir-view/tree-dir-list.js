import React, { Component } from 'react';

class TreeDirList extends React.Component {

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
        <td className="dirent-icon" style={{width: "5%"}}>
          <img src={node.type === "dir" ? "/media/img/folder-192.png" : "/media/img/file/192/txt.png"}></img>
        </td>
        <td style={{width: "60%"}}>
          <a className="custom-link" onClick={this.onMainNodeClick}>{node.name}</a>
        </td>
        <td style={{width: "15%"}}>{node.size}</td>
        <td style={{width: "20%"}} title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    )
  }
}

export default TreeDirList;
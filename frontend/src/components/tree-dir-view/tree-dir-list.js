import React, { Component } from 'react';
import { serviceUrl } from '../constants';
class TreeDirList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMourseEnter: false,
      highlight: '',
    }
  }

  onStarredClick = () => {
    this.props.onStarredClick(this.props.node);
  }

  onMouseEnter = () => {
    this.setState({
      highlight: 'tr-highlight'
    });
  }

  onMouseLeave = () => {
    this.setState({
      highlight: '',
    });
  }

  onMainNodeClick = () => {
    this.props.onMainNodeClick(this.props.node);
  }

  render() {
    let node = this.props.node;
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="star" style={{width: "4%"}}>
          {!node.isDir() && <a  className={node.starred ? 'fas fa-star' : 'far fa-star'} onClick={this.onStarredClick}></a>}
        </td>
        <td className="icon" style={{width: "4%"}}>
          <img src={node.type === "dir" ? serviceUrl + "/media/img/folder-192.png" : serviceUrl + "/media/img/file/192/txt.png"}></img>
        </td>
        <td className="name a-simulate" style={{width: "56%"}} onClick={this.onMainNodeClick}>{node.name}</td>
        <td style={{width: "16%"}}>{node.size}</td>
        <td style={{width: "20%"}} title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    )
  }
}

export default TreeDirList;

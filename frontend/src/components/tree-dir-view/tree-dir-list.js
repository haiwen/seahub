import React, { Component } from 'react';
import { serviceUrl } from '../constants';
import OperationGroup from '../dirent-item-operation/operation-group';

class TreeDirList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: '',
      isOperationShow: false,
      isItemFreezed: false,
      isItemMenuShow: false,
      menuPosition: {top: '', left: ''}
    };
  }

  onMouseEnter = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        highlight: 'tr-highlight',
        isOperationShow: true,
      });
    }
  }

  onMouseOver = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        highlight: 'tr-highlight',
        isOperationShow: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        highlight: '',
        isOperationShow: false
      });
    }
  }

  onItemMenuShow = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    let left = e.clientX - 8*16;
    let top  = e.clientY + 15;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      isItemMenuShow: !this.state.isItemMenuShow,
      isItemFreezed: !this.state.isItemMenuShow,
      menuPosition: position
    })
  }

  onItemMenuHide = (e) => {
    this.setState({
      isItemMenuShow: false,
      isItemFreezed: false,
      isOperationShow: false,
      highlight: ''
    });
  }

  onMainNodeClick = () => {
    this.props.onMainNodeClick(this.props.node);
  }

  onDownload = () => {
    this.props.onDownload(this.props.node);
  }

  onDelete = () => {
    this.props.onDelete(this.props.node);
  }

  render() {
    let node = this.props.node;
    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onMouseOver={this.onMouseOver}>
        <td className="icon">
          <img src={node.type === "dir" ? serviceUrl + "/media/img/folder-192.png" : serviceUrl + "/media/img/file/192/txt.png"}></img>
        </td>
        <td className="name a-simulate" onClick={this.onMainNodeClick}>{node.name}</td>
        <td>
          {
            this.state.isOperationShow && 
            <OperationGroup 
              item={node} 
              isItemMenuShow={this.state.isItemMenuShow}
              menuPosition={this.state.menuPosition}
              onItemMenuShow={this.onItemMenuShow}
              onItemMenuHide={this.onItemMenuHide}
              onDownload={this.onDownload}
              onDelete={this.onDelete}
            />
          }
        </td>
        <td>{node.size}</td>
        <td title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    )
  }
}

export default TreeDirList;

import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl } from '../../utils/constants';
import OperationGroup from '../dirent-operation/operation-group';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  node: PropTypes.object.isRequired,
  needOperationGroup: PropTypes.bool.isRequired,
  onItemMenuHide: PropTypes.func.isRequired,
  onItemMenuShow: PropTypes.func.isRequired,
  onMainNodeClick: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

class TreeDirList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOperationShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false
      });
    }
  }

  onItemMenuShow = () => {
    this.props.onItemMenuShow();
  }

  onItemMenuHide = () => {
    this.setState({
      isOperationShow: false,
      highlight: ''
    });
    this.props.onItemMenuHide();
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
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onMouseOver={this.onMouseOver}>
        <td className="icon">
          <img src={node.type === 'dir' ? serviceUrl + '/media/img/folder-192.png' : serviceUrl + '/media/img/file/192/txt.png'} alt='icon'></img>
        </td>
        <td className="name a-simulate" onClick={this.onMainNodeClick}>{node.name}</td>
        {
          this.props.needOperationGroup &&
          <td>
            {
              this.state.isOperationShow && 
              <OperationGroup 
                item={node} 
                onItemMenuShow={this.onItemMenuShow}
                onItemMenuHide={this.onItemMenuHide}
                onDownload={this.onDownload}
                onDelete={this.onDelete}
              />
            }
          </td>
        }
        <td>{node.size}</td>
        <td title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    );
  }
}

TreeDirList.propTypes = propTypes;

export default TreeDirList;

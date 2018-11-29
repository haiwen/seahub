import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  node: PropTypes.object.isRequired,
  onMainNodeClick: PropTypes.func.isRequired,
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
    this.setState({highlight: true});
  }


  onMouseLeave = () => {
    this.setState({highlight: false});
  }

  onMainNodeClick = () => {
    this.props.onMainNodeClick(this.props.node);
  }

  render() {
    let node = this.props.node;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="icon">
          <img src={node.type === 'dir' ? siteRoot + 'media/img/folder-192.png' : siteRoot + 'media/img/file/192/txt.png'} alt='icon'></img>
        </td>
        <td className="name a-simulate" onClick={this.onMainNodeClick}>{node.name}</td>
        <td>{node.size}</td>
        <td title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    );
  }
}

TreeDirList.propTypes = propTypes;

export default TreeDirList;

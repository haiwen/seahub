import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

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

  onMainNodeClick = (e) => {
    e.preventDefault();
    this.props.onMainNodeClick(this.props.node);
  }

  render() {
    let node = this.props.node;
    let href = siteRoot + 'wikis' + node.path;

    let size = Utils.isHiDPI() ? 48 : 24;
    let iconUrl = '';
    if (node.type === 'file') {
      iconUrl = Utils.getFileIconUrl(node.name, size);
    } else {
      let isReadOnly = false;
      if (node.permission === 'r' || node.permission === 'preview') {
        isReadOnly = true;
      }
      iconUrl = Utils.getFolderIconUrl({isReadOnly, size});
    }

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center">
          <img src={iconUrl} width="24" alt="" />
        </td>
        <td className="name">
          <a href={href} onClick={this.onMainNodeClick}>{node.name}</a>
        </td>
        <td>{node.size}</td>
        <td title={node.last_update_time}>{node.last_update_time}</td>
      </tr>
    );
  }
}

TreeDirList.propTypes = propTypes;

export default TreeDirList;

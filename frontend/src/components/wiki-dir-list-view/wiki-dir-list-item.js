import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  onDirentClick: PropTypes.func.isRequired,
};

class WikiDirListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({highlight: true});
  }

  onMouseLeave = () => {
    this.setState({highlight: false});
  }

  onContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
  }

  onDirentClick = (e) => {
    e.preventDefault();
    this.props.onDirentClick(this.props.dirent);
  }

  render() {
    let { path, dirent } = this.props;
    let href = siteRoot + 'published' + Utils.joinPath(path, dirent.name);
    let iconUrl = Utils.getDirentIcon(dirent);

    const isDesktop = Utils.isDesktop();
    return isDesktop ? (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onContextMenu={this.onContextMenu}>
        <td className="text-center">
          <img src={iconUrl} width="24" alt="" />
        </td>
        <td className="name">
          <a href={href} onClick={this.onDirentClick}>{dirent.name}</a>
        </td>
        <td>{dirent.size}</td>
        <td>{dirent.mtime_relative}</td>
      </tr>
    ) : (
      <tr>
        <td className="text-center">
          <img src={iconUrl} width="24" alt="" />
        </td>
        <td>
          <a href={href} onClick={this.onDirentClick}>{dirent.name}</a>
          <br />
          <span className="item-meta-info">{dirent.size}</span>
          <span className="item-meta-info">{dirent.mtime_relative}</span>
        </td>
      </tr>
    );
  }
}

WikiDirListItem.propTypes = propTypes;

export default WikiDirListItem;

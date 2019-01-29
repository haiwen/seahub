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

  onDirentClick = (e) => {
    e.preventDefault();
    this.props.onDirentClick(this.props.dirent);
  }

  render() {
    let { path, dirent } = this.props;
    let href = siteRoot + 'wikis' + Utils.joinPath(path, dirent.name);
    let iconUrl = Utils.getDirentIcon(dirent);

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center">
          <img src={iconUrl} width="24" alt="" />
        </td>
        <td className="name">
          <a href={href} onClick={this.onDirentClick}>{dirent.name}</a>
        </td>
        <td>{dirent.size}</td>
        <td title={dirent.mtime_relative}>{dirent.mtime_relative}</td>
      </tr>
    );
  }
}

WikiDirListItem.propTypes = propTypes;

export default WikiDirListItem;

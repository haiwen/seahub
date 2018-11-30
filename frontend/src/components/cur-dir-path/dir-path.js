import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '../../utils/constants';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = e.target.dataset.path;
    this.props.onPathClick(path);
  }

  turnPathToLink = (path) => {
    path = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    let pathList = path.split('/');
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (item === '') {
        return;
      }
      if (index === (pathList.length - 1)) {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        );
      } else {
        nodePath += '/' + item;
        return (
          <span key={index} >
            <span className="path-split">/</span>
            <a className="path-link" data-path={nodePath} onClick={this.onPathClick}>{item}</a>
          </span>
        );
      }
    });
    return pathElem;
  }

  render() {
    let { currentPath, repoName } = this.props;
    let pathElem = this.turnPathToLink(currentPath);
    return (
      <div className="path-containter">
        <a href={siteRoot + 'library/'} className="normal">{gettext('Libraries')}</a>
        <span className="path-split">/</span>
        {currentPath === '/' ?
          <span>{repoName}</span>:
          <a className="path-link" data-path="/" onClick={this.onPathClick}>{repoName}</a>
        }
        {pathElem}
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

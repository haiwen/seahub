import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
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
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="path-file-name">{item}</span>
          </Fragment>
        );
      } else {
        nodePath += '/' + item;
        return (
          <Fragment key={index} >
            <span className="path-split">/</span>
            <a className="path-link" data-path={nodePath} onClick={this.onPathClick}>{item}</a>
          </Fragment>
        );
      }
    });
    return pathElem;
  }

  render() {
    let { isSystemRepo, currentPath, repoName } = this.props;
    let pathElem = this.turnPathToLink(currentPath);

    return (
      <div className="path-container">
        {isSystemRepo ?
          <a href={`${siteRoot}sys/system-library/`}>{gettext('System')}</a> :
          <a href={`${siteRoot}sys/all-libraries/`}>{gettext('All')}</a>
        }
        <span className="path-split">/</span>
        {(currentPath === '/' || currentPath === '') ?
          <span className="path-repo-name">{repoName}</span>:
          <a className="path-link" data-path="/" onClick={this.onPathClick}>{repoName}</a>
        }
        {pathElem}
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import LastPathItemWrapper from './last-path-item-wrapper';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  userPerm: PropTypes.string.isRequired,
  openFileInput: PropTypes.func.isRequired
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  };

  turnPathToLink = (path) => {
    path = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    let pathList = path.split('/');
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (item === '') {
        return null;
      }
      if (index === (pathList.length - 1)) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <LastPathItemWrapper
              userPerm={this.props.userPerm}
              openFileInput={this.props.openFileInput}
            >
              <span className="last-path-item" title={item}>{item}</span>
            </LastPathItemWrapper>
          </Fragment>
        );
      } else {
        nodePath += '/' + item;
        return (
          <Fragment key={index} >
            <span className="path-split">/</span>
            <span className="path-item" role="button" data-path={nodePath} onClick={this.onPathClick} title={item}>{item}</span>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

  render() {
    const { currentPath, repoName } = this.props;
    const pathElem = this.turnPathToLink(currentPath);

    return (
      <div className="path-container dir-view-path">
        <Link to={siteRoot + 'shared-with-ocm/'} className="path-item normal" onClick={(e) => this.props.onTabNavClick('shared-with-ocm')} title={gettext('Shared from other servers')}>{gettext('Shared from other servers')}</Link>
        <span className="path-split">/</span>
        {(currentPath === '/' || currentPath === '')
          ? (
            <LastPathItemWrapper
              userPerm={this.props.userPerm}
              openFileInput={this.props.openFileInput}
            >
              <span className="last-path-item" title={repoName}>{repoName}</span>
            </LastPathItemWrapper>
          )
          : <span role="button" className="path-item" data-path="/" onClick={this.onPathClick} title={repoName}>{repoName}</span>
        }
        {pathElem}
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

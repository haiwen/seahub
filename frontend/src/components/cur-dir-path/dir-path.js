import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../utils/constants';
import InternalLinkDialog from '../dialog/internal-link-dialog';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  repoID: PropTypes.string.isRequired,
  isViewFile: PropTypes.bool,
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = e.target.dataset.path;
    this.props.onPathClick(path);
  }

  onTabNavClick = (tabName, id) => {
    this.props.onTabNavClick(tabName, id);
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
      <div className="path-container">
        {this.props.pathPrefix && this.props.pathPrefix.map((item, index) => {
          return (
            <Fragment key={index}>
              <Link to={item.url} className="normal" onClick={() => this.onTabNavClick(item.name, item.id)}>{gettext(item.showName)}</Link>
              <span className="path-split">/</span>
            </Fragment>
          );
        })}
        {this.props.pathPrefix && this.props.pathPrefix.length === 0 && (
          <Fragment>
            <Link to={siteRoot + 'my-libs/'} className="normal" onClick={() => this.onTabNavClick.bind(this, 'my-libs')}>{gettext('Libraries')}</Link>
            <span className="path-split">/</span>
          </Fragment>
        )
        }
        {!this.props.pathPrefix && (
          <Fragment>
            <a href={siteRoot + 'my-libs/'} className="normal" onClick={() => this.onTabNavClick.bind(this, 'my-libs')}>{gettext('Libraries')}</a>
            <span className="path-split">/</span>
          </Fragment>
        )}
        {currentPath === '/' ?
          <span>{repoName}</span>:
          <a className="path-link" data-path="/" onClick={this.onPathClick}>{repoName}</a>
        }
        {pathElem}
        { this.props.isViewFile && 
          <InternalLinkDialog 
            repoID={this.props.repoID}
            path={this.props.currentPath}
          />
        }
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

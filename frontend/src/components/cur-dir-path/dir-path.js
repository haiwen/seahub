import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { UncontrolledTooltip } from 'reactstrap';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { InternalLinkOperation } from '../operations';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  repoID: PropTypes.string.isRequired,
  isViewFile: PropTypes.bool,
  fileTags: PropTypes.array.isRequired,
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  }

  onTabNavClick = (e, tabName, id) => {
    if (window.uploader &&
      window.uploader.isUploadProgressDialogShow &&
      window.uploader.totalProgress !== 100) {
      if (!window.confirm(gettext('A file is being uploaded. Are you sure you want to leave this page?'))) {
        e.preventDefault();
        return false;
      }
      window.uploader.isUploadProgressDialogShow = false;
    }
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
    let { currentPath, repoName, fileTags } = this.props;
    let pathElem = this.turnPathToLink(currentPath);

    let tagTitle = '';
    if (fileTags.length > 0) {
      fileTags.forEach(item => {
        tagTitle += item.name + ' ';
      });
    }

    return (
      <div className="path-container">
        {this.props.pathPrefix && this.props.pathPrefix.map((item, index) => {
          return (
            <Fragment key={index}>
              <Link to={item.url} className="normal" onClick={(e) => this.onTabNavClick(e, item.name, item.id)}>{gettext(item.showName)}</Link>
              <span className="path-split">/</span>
            </Fragment>
          );
        })}
        {this.props.pathPrefix && this.props.pathPrefix.length === 0 && (
          <Fragment>
            <Link to={siteRoot + 'my-libs/'} className="normal" onClick={(e) => this.onTabNavClick(e, 'my-libs')}>{gettext('Libraries')}</Link>
            <span className="path-split">/</span>
          </Fragment>
        )}
        {!this.props.pathPrefix && (
          <Fragment>
            <Link href={siteRoot + 'my-libs/'} className="normal" onClick={(e) => this.onTabNavClick(e, 'my-libs')}>{gettext('Libraries')}</Link>
            <span className="path-split">/</span>
          </Fragment>
        )}
        {(currentPath === '/' || currentPath === '') ?
          <span className="path-repo-name">{repoName}</span>:
          <a className="path-link" data-path="/" onClick={this.onPathClick}>{repoName}</a>
        }
        {pathElem}
        {this.props.isViewFile && (
          <InternalLinkOperation repoID={this.props.repoID} path={this.props.currentPath}/>
        )}
        {(this.props.isViewFile && fileTags.length !== 0) &&
          <span id='column-mode-file-tags' className="tag-list tag-list-stacked align-middle ml-1 d-flex align-items-center">
            {fileTags.map((fileTag, index) => {
              return (<span className="file-tag" key={fileTag.id} style={{zIndex: index, backgroundColor: fileTag.color}}></span>);
            })}
            <UncontrolledTooltip target="column-mode-file-tags" placement="bottom">
              {tagTitle}
            </UncontrolledTooltip>
          </span>
        }
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { UncontrolledTooltip } from 'reactstrap';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { InternalLinkOperation } from '../operations';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  repoID: PropTypes.string.isRequired,
  isViewFile: PropTypes.bool,
  fileTags: PropTypes.array.isRequired,
  toggleTreePanel: PropTypes.func.isRequired
};

class DirPath extends React.Component {

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  };

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
            <DirOperationToolBar
              path={this.props.currentPath}
              repoID={this.props.repoID}
              repoName={this.props.repoName}
              repoEncrypted={this.props.repoEncrypted}
              direntList={this.props.direntList}
              showShareBtn={this.props.showShareBtn}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              onAddFile={this.props.onAddFile}
              onAddFolder={this.props.onAddFolder}
              onUploadFile={this.props.onUploadFile}
              onUploadFolder={this.props.onUploadFolder}
            >
              <span className="path-file-name">{item}</span>
            </DirOperationToolBar>
          </Fragment>
        );
      } else {
        nodePath += '/' + item;
        return (
          <Fragment key={index} >
            <span className="path-split">/</span>
            <a className="path-link path-item" data-path={nodePath} onClick={this.onPathClick}>{item}</a>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

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
      <div className="path-container dir-view-path">
        <button className="op-btn mr-2" onClick={this.props.toggleTreePanel}><span className="sf3-font-side-bar sf3-font"></span></button>
        {this.props.pathPrefix && this.props.pathPrefix.map((item, index) => {
          return (
            <Fragment key={index}>
              <Link to={item.url} className="path-item normal" onClick={(e) => this.onTabNavClick(e, item.name, item.id)}>{gettext(item.showName)}</Link>
              <span className="path-split">/</span>
            </Fragment>
          );
        })}
        {this.props.pathPrefix && this.props.pathPrefix.length === 0 && (
          <Fragment>
            <Link to={siteRoot + 'libraries/'} className="path-item normal" onClick={(e) => this.onTabNavClick(e, 'libraries')}>{gettext('Files')}</Link>
            <span className="path-split">/</span>
          </Fragment>
        )}
        {!this.props.pathPrefix && (
          <Fragment>
            <Link to={siteRoot + 'libraries/'} className="path-item normal" onClick={(e) => this.onTabNavClick(e, 'libraries')}>{gettext('Files')}</Link>
            <span className="path-split">/</span>
          </Fragment>
        )}
        {(currentPath === '/' || currentPath === '') ?
          <DirOperationToolBar
            path={this.props.currentPath}
            repoID={this.props.repoID}
            repoName={this.props.repoName}
            repoEncrypted={this.props.repoEncrypted}
            direntList={this.props.direntList}
            showShareBtn={this.props.showShareBtn}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            userPerm={this.props.userPerm}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            onAddFile={this.props.onAddFile}
            onAddFolder={this.props.onAddFolder}
            onUploadFile={this.props.onUploadFile}
            onUploadFolder={this.props.onUploadFolder}
          >
            <span className="path-repo-name">{repoName}</span>
          </DirOperationToolBar> :
          <a className="path-item" data-path="/" onClick={this.onPathClick}>{repoName}</a>
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

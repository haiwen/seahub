import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { Link } from '@gatsbyjs/reach-router';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MetadataViewName from '../../metadata/components/metadata-view-name';
import TagViewName from '../../tag/components/tag-view-name';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { debounce } from '../../metadata/utils/common';
import { EVENT_BUS_TYPE } from '../../metadata/constants';

const propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  fileTags: PropTypes.array.isRequired,
  toggleTreePanel: PropTypes.func.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  repoTags: PropTypes.array.isRequired,
  filePermission: PropTypes.string,
  onFileTagChanged: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func.isRequired,
};

class DirPath extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropTargetPath: '',
    };
  }

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

  onDragEnter = (e) => {
    e.preventDefault();
    if (Utils.isIEBrowser()) {
      return false;
    }
    this.setState({
      dropTargetPath: e.target.dataset.path,
    });
  };

  onDragLeave = (e) => {
    e.preventDefault();
    if (Utils.isIEBrowser()) {
      return false;
    }
    this.setState({
      dropTargetPath: '',
    });
  };

  onDragOver = (e) => {
    if (Utils.isIEBrowser()) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onDrop = (e) => {
    if (Utils.isIEBrowser()) {
      return false;
    }

    if (e.dataTransfer.files.length) {
      return;
    }

    let selectedPath = Utils.getEventData(e, 'path');
    let dragStartItemsData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemsData = JSON.parse(dragStartItemsData);

    if (Array.isArray(dragStartItemsData)) {
      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
    } else {
      let { nodeDirent, nodeParentPath } = dragStartItemsData;
      this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
    }

    this.setState({
      dropTargetPath: '',
    });
  };

  handleRefresh = debounce(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  }, 200);

  pathItem = ({ index, id, item, showRefresh, role, onClick = () => {} }) => {
    return (
      <Fragment key={index}>
        <span className="path-split">/</span>
        <span className="path-item" role={role} onClick={onClick}>{id ? <MetadataViewName id={id} /> : item}</span>
        {showRefresh && (
          <div className="path-item-refresh" id="sf-metadata-view-refresh" onClick={this.handleRefresh}>
            <i className="sf3-font sf3-font-refresh"></i>
            <UncontrolledTooltip target="sf-metadata-view-refresh" placement="bottom">
              {gettext('Refresh the view')}
            </UncontrolledTooltip>
          </div>
        )}
      </Fragment>
    );
  };

  turnPathToLink = (path) => {
    path = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    let pathList = path.split('/');
    let nodePath = '';
    if (pathList.length === 2 && !pathList[0] && [PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES, PRIVATE_FILE_TYPE.TAGS_PROPERTIES].includes(pathList[1])) {
      return null;
    }
    let pathElem = pathList.map((item, index) => {
      if (item === '') {
        return null;
      }
      if ((index === pathList.length - 2 || index === pathList.length - 3) && item === PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="path-item">{gettext('Views')}</span>
          </Fragment>
        );
      }

      if (index === pathList.length - 2 && item === PRIVATE_FILE_TYPE.TAGS_PROPERTIES) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="path-item">{gettext('Tags')}</span>
          </Fragment>
        );
      }

      if (index === pathList.length - 1 && pathList[pathList.length - 2] === PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) {
        return this.pathItem({ index, id: item, showRefresh: true });
      }

      if (index === pathList.length - 2 && pathList[pathList.length - 3] === PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES && pathList[pathList.length - 1]) {
        return this.pathItem({ index, id: item, showRefresh: false, role: 'button', onClick: this.handleRefresh });
      }

      if (index === pathList.length - 1 && pathList[pathList.length - 3] === PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) {
        return this.pathItem({ index, item: item, showRefresh: true });
      }

      if (index === pathList.length - 1 && pathList[pathList.length - 2] === PRIVATE_FILE_TYPE.TAGS_PROPERTIES) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <TagViewName id={item} />
          </Fragment>
        );
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
              loadDirentList={this.props.loadDirentList}
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
            <span
              className={`path-item ${nodePath === this.state.dropTargetPath ? 'path-item-drop' : ''}`}
              data-path={nodePath} onClick={this.onPathClick}
              onDragEnter={this.onDragEnter}
              onDragLeave={this.onDragLeave}
              onDragOver={this.onDragOver}
              onDrop={this.onDrop}
              role="button">
              {item}
            </span>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

  isViewMetadata = () => {
    const { currentPath } = this.props;
    const path = currentPath[currentPath.length - 1] === '/' ? currentPath.slice(0, currentPath.length - 1) : currentPath;
    const pathList = path.split('/');
    return pathList[pathList.length - 2] === PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES;
  };

  render() {
    let { currentPath, repoName } = this.props;
    let pathElem = this.turnPathToLink(currentPath);
    return (
      <div className="path-container dir-view-path">
        <span className="cur-view-path-btn mr-1" onClick={this.props.toggleTreePanel}>
          <span className="sf3-font-side-bar sf3-font"></span>
        </span>
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
            loadDirentList={this.props.loadDirentList}
          >
            <span className="path-repo-name">{repoName}</span>
          </DirOperationToolBar> :
          <span className="path-item" data-path="/" onClick={this.onPathClick} role="button">{repoName}</span>
        }
        {pathElem}
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

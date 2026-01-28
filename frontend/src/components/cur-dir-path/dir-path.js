import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { Link } from '@gatsbyjs/reach-router';
import DirOperationToolbar from '../../components/toolbar/dir-operation-toolbar';
import MetadataViewName from '../../metadata/components/metadata-view-name';
import TagViewName from '../../tag/components/tag-view-name';
import { siteRoot, gettext } from '../../utils/constants';
import { debounce, Utils } from '../../utils/utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import OpIcon from '../../components/op-icon';
import Icon from '../icon';

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
  isTreePanelShown: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  repoTags: PropTypes.array.isRequired,
  filePermission: PropTypes.string,
  onItemMove: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func.isRequired,
};

class DirPath extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropTargetPath: '',
      showTrashFolder: false,
      trashData: null
    };
  }

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.setState({ showTrashFolder: false });
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

  turnViewPathToLink = (pathList) => {
    if (!Array.isArray(pathList) || pathList.length === 0) return null;
    const [, , viewId, children] = pathList;
    return (
      <>
        <span className="path-split">/</span>
        <span className="path-item path-item-read-only">{gettext('Views')}</span>
        <span className="path-split">/</span>
        <span
          className="path-item path-item-read-only"
          role={children ? 'button' : null}
          tabIndex={children ? 0 : -1}
          aria-label={children ? gettext('Refresh the view') : ''}
          onClick={children ? this.handleRefresh : () => {}}
          onKeyDown={children ? Utils.onKeyDown : () => {}}
          title={children ? gettext('Refresh the view') : ''}
        >
          {viewId && <MetadataViewName id={viewId} />}
        </span>
        {children && (
          <>
            <span className="path-split">/</span>
            <span className="path-item path-item-read-only">{children}</span>
          </>
        )}
        <div
          className="path-item-refresh"
          id="sf-metadata-view-refresh"
          role="button"
          tabIndex={0}
          aria-label={gettext('Refresh the view')}
          onClick={this.handleRefresh}
          onKeyDown={Utils.onKeyDown}
        >
          <Icon symbol="refresh" />
          <UncontrolledTooltip target="sf-metadata-view-refresh" placement="bottom">
            {gettext('Refresh the view')}
          </UncontrolledTooltip>
        </div>
      </>
    );
  };

  turnTagPathToLink = (pathList) => {
    if (!Array.isArray(pathList) || pathList.length === 0) return null;
    const [, , tagId, children] = pathList;
    const canSelectAllTags = tagId === ALL_TAGS_ID && !!children;
    return (
      <>
        <span className="path-split">/</span>
        <span className="path-item path-item-read-only">{gettext('Tags')}</span>
        <span className="path-split">/</span>
        <TagViewName id={tagId} canSelectAllTags={canSelectAllTags} repoID={this.props.repoID} />
        {children && (
          <>
            <span className="path-split">/</span>
            <span className="path-item path-item-read-only">{children}</span>
          </>
        )}
      </>
    );
  };

  componentWillUnmount() {
    this.unsubscribeUpdateTrashFolderPath && this.unsubscribeUpdateTrashFolderPath();
  }

  clickTrashRoot = () => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
    this.setState({
      showTrashFolder: false
    });
  };

  clickFolderPath = (folderPath) => {
    const { trashData } = this.state;
    const { commitID, baseDir } = trashData;
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOAD_TRASH_FOLDER_RECORDS, commitID, baseDir, folderPath);
  };

  renderTrashFolderPath = () => {
    const { trashData } = this.state;
    const { commitID, baseDir, folderPath } = trashData;
    const pathList = folderPath.split('/');

    return (
      <React.Fragment>
        <span className="path-split">/</span>
        <span
          className="path-item"
          tabIndex={0}
          role="button"
          onClick={this.clickTrashRoot}
          onKeyDown={Utils.onKeyDown}
          aria-label={gettext('Trash')}
        >
          {gettext('Trash')}
        </span>
        <span className="path-split">/</span>
        {pathList.map((item, index) => {
          if (index > 0 && index != pathList.length - 1) {
            return (
              <React.Fragment key={index}>
                <span
                  className="path-item"
                  title={pathList[index]}
                  tabIndex={0}
                  role="button"
                  onClick={this.clickFolderPath.bind(this, pathList.slice(0, index + 1).join('/'))}
                  onKeyDown={Utils.onKeyDown}
                  aria-label={pathList[index]}
                >
                  {pathList[index]}
                </span>
                <span className="path-split">/</span>
              </React.Fragment>
            );
          }
          return null;
        }
        )}
        <span className="last-path-item" title={pathList[pathList.length - 1]}>{pathList[pathList.length - 1]}</span>
      </React.Fragment>
    );
  };

  turnTrashPathToLink = () => {
    let timer = setInterval(() => {
      if (window.sfMetadataContext && window.sfMetadataContext.eventBus) {
        timer && clearInterval(timer);
        timer = null;
        const eventBus = window.sfMetadataContext.eventBus;
        this.unsubscribeUpdateTrashFolderPath = eventBus.subscribe(
          EVENT_BUS_TYPE.UPDATE_TRASH_FOLDER_PATH,
          (data) => {
            this.setState({
              showTrashFolder: true,
              trashData: data
            });
          }
        );
      }
    }, 300);

    return (
      <>
        <span className="path-split">/</span>
        <span className="path-item path-item-read-only">{gettext('Trash')}</span>
      </>
    );
  };


  turnPathToLink = (path) => {
    path = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    const pathList = path.split('/');
    if (pathList.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES)) {
      return this.turnViewPathToLink(pathList);
    }
    if (pathList.includes(PRIVATE_FILE_TYPE.TAGS_PROPERTIES)) {
      return this.turnTagPathToLink(pathList);
    }
    if (pathList.includes(PRIVATE_FILE_TYPE.TRASH)) {
      return this.turnTrashPathToLink();
    }
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (item === '') return null;
      if (index === (pathList.length - 1)) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <DirOperationToolbar
              path={this.props.currentPath}
              repoID={this.props.repoID}
              repoName={this.props.repoName}
              repoEncrypted={this.props.repoEncrypted}
              direntList={this.props.direntList}
              showShareBtn={this.props.showShareBtn}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              eventBus={this.props.eventBus}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              onUploadFile={this.props.onUploadFile}
              onUploadFolder={this.props.onUploadFolder}
              loadDirentList={this.props.loadDirentList}
            >
              <span className="last-path-item" title={item}>{item}</span>
            </DirOperationToolbar>
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
              role="button"
              title={item}
            >
              {item}
            </span>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

  render() {
    const { showTrashFolder } = this.state;
    const { currentPath, repoName, isTreePanelShown } = this.props;
    const pathElem = showTrashFolder ? this.renderTrashFolderPath() : this.turnPathToLink(currentPath);
    return (
      <div className="path-container dir-view-path">
        <OpIcon
          className="cur-view-path-btn mr-1"
          symbol="side-bar"
          title={isTreePanelShown ? gettext('Close the panel') : gettext('Open the panel')}
          op={this.props.toggleTreePanel}
        />
        {this.props.pathPrefix && this.props.pathPrefix.map((item, index) => {
          return (
            <Fragment key={index}>
              <Link to={item.url} className="path-item normal" onClick={(e) => this.onTabNavClick(e, item.name, item.id)} title={gettext(item.showName)}>{gettext(item.showName)}</Link>
              <span className="path-split">/</span>
            </Fragment>
          );
        })}
        {this.props.pathPrefix && this.props.pathPrefix.length === 0 && (
          <>
            <Link to={siteRoot + 'libraries/'} className="flex-shrink-0 path-item normal" onClick={(e) => this.onTabNavClick(e, 'libraries')}>{gettext('Files')}</Link>
            <span className="path-split">/</span>
          </>
        )}
        {!this.props.pathPrefix && (
          <>
            <Link to={siteRoot + 'libraries/'} className="flex-shrink-0 path-item normal" onClick={(e) => this.onTabNavClick(e, 'libraries')}>{gettext('Files')}</Link>
            <span className="path-split">/</span>
          </>
        )}
        {(currentPath === '/' || currentPath === '') ?
          <DirOperationToolbar
            path={this.props.currentPath}
            repoID={this.props.repoID}
            repoName={this.props.repoName}
            repoEncrypted={this.props.repoEncrypted}
            direntList={this.props.direntList}
            showShareBtn={this.props.showShareBtn}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            userPerm={this.props.userPerm}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            eventBus={this.props.eventBus}
            onUploadFile={this.props.onUploadFile}
            onUploadFolder={this.props.onUploadFolder}
            loadDirentList={this.props.loadDirentList}
          >
            <span className="last-path-item" title={repoName}>{repoName}</span>
          </DirOperationToolbar> :
          <span
            className="path-item"
            data-path="/"
            onClick={this.onPathClick}
            onKeyDown={Utils.onKeyDown}
            role="button"
            title={repoName}
            tabIndex="0"
          >
            {repoName}
          </span>
        }
        {pathElem}
      </div>
    );
  }
}

DirPath.propTypes = propTypes;

export default DirPath;

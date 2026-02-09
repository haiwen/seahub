import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, UncontrolledTooltip } from 'reactstrap';
import { Link } from '@gatsbyjs/reach-router';
import DirOperationToolbar from '../../components/toolbar/dir-operation-toolbar';
import MetadataViewName from '../../metadata/components/metadata-view-name';
import TagViewName from '../../tag/components/tag-view-name';
import { siteRoot, gettext, username, enableUserCleanTrash } from '../../utils/constants';
import { debounce, Utils } from '../../utils/utils';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import { ALL_TAGS_ID } from '../../tag/constants';
import OpIcon from '../../components/op-icon';
import Icon from '../icon';
import { getTrashPath } from '../dir-view-mode/dir-trash-view/utils';
import EventBus from '../common/event-bus';
import CleanTrash from '../dialog/clean-trash';

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
    };
  }

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  };

  onTrashPathClick = (e) => {
    // update path
    let path = Utils.getEventData(e, 'path');
    this.props.onTrashPathClick(path);

    // update content
    const eventBus = EventBus.getInstance();
    eventBus.dispatch('update_trash_path_by_dir_path', path);
  };

  isTrashMode = () => {
    return location.href.indexOf('?trash=true') > -1;
  };

  isHistoryMode = () => {
    return location.href.indexOf('?history=true') > -1;
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

  toggleDesktopOpMenu = () => {
    this.setState({ isDesktopMenuOpen: !this.state.isDesktopMenuOpen });
  };

  toggleCleanTrashDialog = () => {
    this.setState({ isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen });
  };

  refreshTrash = () => {
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.REFRESH_TRASH);
  };

  renderCleanTrash = () => {
    const { currentRepoInfo } = this.props;
    const { owner_email, is_admin } = currentRepoInfo;
    const isRepoAdmin = owner_email === username || is_admin;
    if (!enableUserCleanTrash || !isRepoAdmin) {
      return null;
    }

    return (
      <>
        <Dropdown className='trash-path-dropdown' isOpen={this.state.isDesktopMenuOpen} toggle={this.toggleDesktopOpMenu}>
          <DropdownToggle
            tag="span"
            role="button"
            tabIndex="0"
            className="trash-path-item"
            onClick={this.toggleDesktopOpMenu}
            data-toggle="dropdown"
            aria-label={gettext('More operations')}
            aria-expanded={this.state.isDesktopMenuOpen}
          >
            <Icon symbol="down" className="path-item-dropdown-toggle" />
          </DropdownToggle>
          <DropdownMenu onMouseMove={this.onDropDownMouseMove} className='position-fixed'>
            <DropdownItem onClick={this.toggleCleanTrashDialog}>{gettext('Clean trash')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        {this.state.isCleanTrashDialogOpen && (
          <CleanTrash
            repoID={this.props.repoID}
            refreshTrash={this.refreshTrash}
            toggleDialog={this.toggleCleanTrashDialog}
          />
        )}
      </>
    );
  };

  turnTrashPathToLink = () => {
    const path = getTrashPath();
    if (path === '/') {
      return (
        <>
          <span className="path-split">/</span>
          <span className="path-item path-item-read-only">{gettext('Trash')}</span>
          {this.renderCleanTrash()}
        </>
      );
    }

    const pathList = path.split('/');
    let nodePath = '';
    const pathElem = pathList.map((item, index) => {
      if (item === '') {
        return (
          <>
            <span className="path-split">/</span>
            <span
              className="path-item"
              data-path={'/'}
              onClick={this.onTrashPathClick}
              role="button"
              title={item}
            >
              {gettext('Trash')}
            </span>
          </>
        );
      }
      nodePath += '/' + item;
      return (
        <Fragment key={index} >
          <span className="path-split">/</span>
          <span
            className={'path-item'}
            data-path={nodePath}
            onClick={this.onTrashPathClick}
            role="button"
            title={item}
          >
            {item}
          </span>
        </Fragment>
      );
    });
    return pathElem;
  };

  turnHistoryPathToLink = () => {
    return (
      <>
        <span className="path-split">/</span>
        <span className="path-item path-item-read-only">{gettext('History')}</span>
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

    if (this.isTrashMode()) {
      return this.turnTrashPathToLink(pathList);
    }

    if (this.isHistoryMode()) {
      return this.turnHistoryPathToLink(pathList);
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
    const { currentPath, repoName, isTreePanelShown } = this.props;
    const pathElem = this.turnPathToLink(currentPath);
    const isTrashMode = this.isTrashMode();
    const isHistoryMode = this.isHistoryMode();
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
        {(!isHistoryMode && !isTrashMode && (currentPath === '/' || currentPath === '')) ?
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

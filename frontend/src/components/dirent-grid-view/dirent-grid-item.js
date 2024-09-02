import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'MD5';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  onGridItemContextMenu: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func.isRequired,
  activeDirent: PropTypes.object,
  onGridItemMouseDown: PropTypes.func,
  currentRepoInfo: PropTypes.object,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
};

class DirentGridItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isGridDropTipShow: false,
    };

    const { dirent } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(dirent.permission);
    this.isCustomPermission = isCustomPermission;
    this.customPermission = customPermission;
    this.canPreview = true;
    this.canDrag = dirent.permission === 'rw';
    if (isCustomPermission) {
      const { preview, modify } = customPermission.permission;
      this.canPreview = preview || modify;
      this.canDrag = modify;
    }

    this.clickTimeout = null;
  }

  componentWillUnmount() {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
  }

  onItemClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { dirent } = this.props;

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
      this.handleSingleClick(dirent, e);
      return;
    }

    this.clickTimeout = setTimeout(() => {
      this.clickTimeout = null;
      this.handleSingleClick(dirent, e);
    }, 100); // Clicks within 100 milliseconds is considered a single click.
  };

  handleSingleClick = (dirent, event) => {
    if (!this.canPreview) {
      return;
    }

    if (dirent.isSelected && !event.metaKey && !event.ctrlKey) {
      this.handleDoubleClick(dirent, event);
    } else {
      this.props.onGridItemClick(dirent, event);
    }
  };

  handleDoubleClick = (dirent, event) => {
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  };

  onItemLinkClick = (e) => {
    e.preventDefault();
    const dirent = this.props.dirent;

    if (dirent.isDir()) {
      this.props.onItemClick(dirent);
      return;
    }

    // is have preview permission
    if (!this.canPreview) {
      return;
    }

    this.handleDoubleClick(dirent, e);
  };

  onGridItemDragStart = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }

    const { selectedDirentList, path } = this.props;
    const dragStartItemsData = selectedDirentList.length > 0 ? selectedDirentList.map(dirent => ({
      nodeDirent: dirent,
      nodeParentPath: path
    })) : { nodeDirent: this.props.dirent, nodeParentPath: this.props.path };

    const serializedData = JSON.stringify(dragStartItemsData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/drag-item-info', serializedData);
  };

  onGridItemDragEnter = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    if (this.props.dirent.type === 'dir') {
      this.setState({ isGridDropTipShow: true });
    }
  };

  onGridItemDragOver = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onGridItemDragLeave = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.setState({ isGridDropTipShow: false });
  };

  onGridItemDragDrop = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.setState({ isGridDropTipShow: false });
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }

    let selectedPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let dragStartItemsData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemsData = JSON.parse(dragStartItemsData);

    if (!Array.isArray(dragStartItemsData)) {
      let { nodeDirent, nodeParentPath } = dragStartItemsData;
      let dropItemData = this.props.dirent;
      if (nodeDirent.name === dropItemData.name) {
        return;
      }
      if (dropItemData.type !== 'dir') {
        return;
      }
      this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
    } else {
      // if current dirent is a dir and selected list include it, return
      if (dragStartItemsData.some(item => item.nodeDirent.name === this.props.dirent.name)) {
        return;
      }
      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
    }
  };

  onGridItemMouseDown = (event) => {
    this.props.onGridItemMouseDown(event);
  };

  getFileUrl = (url) => {
    let fileUrlArr = url.split('/');
    if (fileUrlArr.indexOf('48') !== -1) {
      fileUrlArr.splice(fileUrlArr.indexOf('48'), 1, '192');
    }
    let fileUrl = fileUrlArr.join('/');
    return fileUrl;
  };

  onGridItemContextMenu = (event) => {
    let dirent = this.props.dirent;
    this.props.onGridItemContextMenu(event, dirent);
  };

  getTextRenderWidth = (text, font) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font || '14px Arial';
    const metrics = context.measureText(text);
    return metrics.width;
  };

  getRenderedText = (dirent) => {
    const containerWidth = 230;

    let tagRenderWidth = 0;
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      if (dirent.file_tags.length === 1) {
        tagRenderWidth = 16;
      } else {
        tagRenderWidth = 16 + (dirent.file_tags.length - 1) * 8;
      }
    }
    let remainWidth = containerWidth - tagRenderWidth;
    let nameRenderWidth = this.getTextRenderWidth(dirent.name);
    let showName = '';
    if (nameRenderWidth > remainWidth) {
      let dotIndex = dirent.name.lastIndexOf('.');
      let frontName = dirent.name.slice(0, dotIndex - 2);
      let backName = dirent.name.slice(dotIndex - 2);
      let sum = 0;
      for (let i = 0; i < frontName.length; i++) {
        // Use charCodeAt(i) > 127 to check Chinese and English.
        // English and symbols occupy 1 position, Chinese and others occupy 2 positions.
        frontName.charCodeAt(i) > 127 ? (sum = sum + 2) : (sum = sum + 1);
        // When sum position exceeds 20, back string will not be displayed.
        if (sum > 20) {
          frontName = frontName.slice(0, i) + '...';
          break;
        }
      }
      showName = frontName + backName;
    } else {
      showName = dirent.name;
    }
    return showName;
  };

  render() {
    let { dirent, path, repoID } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let iconUrl = Utils.getDirentIcon(dirent, true);
    let fileUrl = dirent.encoded_thumbnail_src ? this.getFileUrl(dirent.encoded_thumbnail_src) : '';

    let toolTipID = '';
    let tagTitle = '';
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      toolTipID = MD5(dirent.name).slice(0, 7);
      tagTitle = dirent.file_tags.map(item => item.name).join(' ');
    }

    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
    if (dirent.is_sdoc_revision && dirent.revision_id) {
      fileHref = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
    }

    let gridClass = 'grid-file-img-link cursor-pointer';
    gridClass += this.state.isGridDropTipShow ? ' grid-drop-show' : ' ';

    let lockedInfo = dirent.is_freezed ? gettext('Frozen by {name}') : gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', dirent.lock_owner_name);

    const lockedImageUrl = `${mediaUrl}img/file-${dirent.is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`;
    const lockedMessage = dirent.is_freezed ? gettext('freezed') : gettext('locked');
    const showName = this.getRenderedText(dirent);
    return (
      <Fragment>
        <li
          className={`grid-item ${dirent.isSelected ? 'grid-selected-active' : ''}`}
          onContextMenu={this.onGridItemContextMenu}
          onMouseDown={this.onGridItemMouseDown}>
          <div
            className={gridClass}
            draggable={this.canDrag}
            onClick={this.onItemClick}
            onDragStart={this.onGridItemDragStart}
            onDragEnter={this.onGridItemDragEnter}
            onDragOver={this.onGridItemDragOver}
            onDragLeave={this.onGridItemDragLeave}
            onDrop={this.onGridItemDragDrop}
          >
            {(this.canPreview && dirent.encoded_thumbnail_src) ?
              <img src={`${siteRoot}${fileUrl}`} className="thumbnail" onClick={this.onItemClick} alt=""/> :
              <img src={iconUrl} width="96" alt='' />
            }
            {dirent.is_locked && <img className="grid-file-locked-icon" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo}/>}
          </div>
          <div className="grid-file-name" onDragStart={this.onGridItemDragStart} draggable={this.canDrag} >
            {(dirent.type !== 'dir' && dirent.file_tags && dirent.file_tags.length > 0) && (
              <Fragment>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked d-inline-block align-middle">
                  {dirent.file_tags.map((fileTag, index) => {
                    let length = dirent.file_tags.length;
                    return (
                      <span className="file-tag" key={fileTag.id} style={{ zIndex: length - index, backgroundColor: fileTag.color }}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </Fragment>
            )}
            {(!dirent.isDir() && !this.canPreview) ?
              <a
                className="sf-link grid-file-name-link"
                onClick={this.onItemClick}
                title={dirent.name}
              >{showName}
              </a> :
              <a
                className="grid-file-name-link"
                href={dirent.type === 'dir' ? dirHref : fileHref}
                onClick={this.onItemClick}
                title={dirent.name}
              >{showName}
              </a>
            }
          </div>
        </li>
      </Fragment>
    );
  }
}

DirentGridItem.propTypes = propTypes;

export default DirentGridItem;

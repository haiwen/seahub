import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import MD5 from 'MD5';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, siteRoot, mediaUrl, enableVideoThumbnail, enablePDFThumbnail } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { imageThumbnailCenter, videoThumbnailCenter } from '../../utils/thumbnail-center';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  onGridItemContextMenu: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func.isRequired,
  onGridItemMouseDown: PropTypes.func,
  currentRepoInfo: PropTypes.object,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
};

class DirentGridItem extends React.Component {

  constructor(props) {
    super(props);
    let dirent = props.dirent;
    this.state = {
      dirent,
      isGridDropTipShow: false,
    };
    const { isCustomPermission, customPermission } = Utils.getUserPermission(dirent.permission);
    this.canPreview = true;
    this.canDrag = dirent.permission === 'rw';
    if (isCustomPermission) {
      const { preview, modify } = customPermission.permission;
      this.canPreview = preview || modify;
      this.canDrag = modify;
    }

    this.clickTimeout = null;
    this.isGeneratingThumbnail = false;
    this.thumbnailCenter = null;
  }

  checkGenerateThumbnail = (dirent) => {
    if (this.props.repoEncrypted || dirent.encoded_thumbnail_src) {
      return false;
    }
    if (enableVideoThumbnail && Utils.videoCheck(dirent.name)) {
      this.thumbnailCenter = videoThumbnailCenter;
      return true;
    }
    if (Utils.imageCheck(dirent.name) || (enablePDFThumbnail && Utils.pdfCheck(dirent.name))) {
      this.thumbnailCenter = imageThumbnailCenter;
      return true;
    }
    return false;
  };

  componentDidMount() {
    const { repoID, path } = this.props;
    const { dirent } = this.state;
    if (this.checkGenerateThumbnail(dirent)) {
      this.isGeneratingThumbnail = true;
      this.thumbnailCenter.createThumbnail({
        repoID,
        path: [path, dirent.name].join('/'),
        callback: this.updateDirentThumbnail,
      });
    }
  }

  componentWillUnmount() {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
    if (this.isGeneratingThumbnail) {
      const { dirent } = this.state;
      const { repoID, path } = this.props;
      this.thumbnailCenter.cancelThumbnail({
        repoID,
        path: [path, dirent.name].join('/'),
      });
      this.thumbnailCenter = null;
    }
    this.setState = () => {};
  }

  updateDirentThumbnail = (encoded_thumbnail_src) => {
    this.isGeneratingThumbnail = false;
    let dirent = this.state.dirent;
    dirent.encoded_thumbnail_src = encoded_thumbnail_src;
    this.setState({ dirent });
  };

  onItemClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { dirent } = this.state;

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
    const { dirent } = this.state;

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
    })) : { nodeDirent: this.state.dirent, nodeParentPath: this.props.path };

    const serializedData = JSON.stringify(dragStartItemsData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/drag-item-info', serializedData);
  };

  onGridItemDragEnter = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    if (this.state.dirent.type === 'dir') {
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

    let selectedPath = Utils.joinPath(this.props.path, this.state.dirent.name);
    let dragStartItemsData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemsData = JSON.parse(dragStartItemsData);

    if (!Array.isArray(dragStartItemsData)) {
      let { nodeDirent, nodeParentPath } = dragStartItemsData;
      let dropItemData = this.state.dirent;
      if (nodeDirent.name === dropItemData.name) {
        return;
      }
      if (dropItemData.type !== 'dir') {
        return;
      }
      this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
    } else {
      // if current dirent is a dir and selected list include it, return
      if (dragStartItemsData.some(item => item.nodeDirent.name === this.state.dirent.name)) {
        return;
      }
      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
    }
  };

  onGridItemMouseDown = (event) => {
    this.props.onGridItemMouseDown(event);
  };

  onGridItemContextMenu = (event) => {
    this.props.onGridItemContextMenu(event, this.state.dirent);
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

  getDirentLink = (dirent) => {
    let { path, repoID, currentRepoInfo } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let link = '';
    if (dirent.type === 'dir') {
      if (currentRepoInfo) {
        link = siteRoot + 'library/' + repoID + '/' + currentRepoInfo.repo_name + Utils.encodePath(direntPath);
      }
    } else {
      link = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
      if (dirent.is_sdoc_revision && dirent.revision_id) {
        link = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
      }
    }
    return link;
  };

  render() {
    let { dirent, isGridDropTipShow } = this.state;
    let { is_freezed, is_locked, lock_owner_name, file_tags, isSelected } = dirent;
    let toolTipID = '';
    let tagTitle = '';
    if (file_tags && file_tags.length > 0) {
      toolTipID = MD5(dirent.name).slice(0, 7);
      tagTitle = file_tags.map(item => item.name).join(' ');
    }
    const showName = this.getRenderedText(dirent);
    return (
      <>
        <li
          className={classnames('grid-item cursor-pointer', { 'grid-selected-active': isSelected })}
          onContextMenu={this.onGridItemContextMenu}
          onMouseDown={this.onGridItemMouseDown}
          onClick={this.onItemClick}
        >
          <div
            className={classnames('grid-file-img-link', { 'grid-drop-show': isGridDropTipShow })}
            draggable={this.canDrag}
            onDragStart={this.onGridItemDragStart}
            onDragEnter={this.onGridItemDragEnter}
            onDragOver={this.onGridItemDragOver}
            onDragLeave={this.onGridItemDragLeave}
            onDrop={this.onGridItemDragDrop}
          >
            {(this.canPreview && dirent.encoded_thumbnail_src) ?
              <img
                src={`${siteRoot}${dirent.encoded_thumbnail_src || ''}?mtime=${dirent.mtime}`}
                className="thumbnail"
                onClick={this.onItemClick}
                alt=""
              /> :
              <img src={Utils.getDirentIcon(dirent, true)} width="80" height="80" alt='' />
            }
            {is_locked &&
              <img
                className="grid-file-locked-icon"
                src={`${mediaUrl}img/file-${is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`}
                alt={is_freezed ? gettext('freezed') : gettext('locked')}
                title={(is_freezed ? gettext('Frozen by {name}') : gettext('locked by {name}')).replace('{name}', lock_owner_name)}
              />
            }
          </div>
          <div className="grid-file-name" onDragStart={this.onGridItemDragStart} draggable={this.canDrag} >
            {(dirent.type !== 'dir' && file_tags && file_tags.length > 0) && (
              <>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked d-inline-block align-middle">
                  {file_tags.map((fileTag, index) => {
                    let length = file_tags.length;
                    return (
                      <span className="file-tag" key={fileTag.id} style={{ zIndex: length - index, backgroundColor: fileTag.color }}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </>
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
                href={this.getDirentLink(dirent)}
                onClick={this.onItemClick}
                title={dirent.name}
              >{showName}
              </a>
            }
          </div>
        </li>
      </>
    );
  }
}

DirentGridItem.propTypes = propTypes;

export default DirentGridItem;

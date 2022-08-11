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
};

class DirentGridItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isGridSelected: false,
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

  }

  componentWillReceiveProps(nextProps) {
    this.setState({isGridSelected: false}, () => {
      if (nextProps.activeDirent && nextProps.activeDirent.name === nextProps.dirent.name) {
        this.setState({isGridSelected: true});
      }
    });
  }

  onItemMove = (destRepo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(destRepo, dirent, selectedPath, currentPath);
  }

  onItemClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { dirent, activeDirent } = this.props;
    if (dirent.isDir()) {
      this.props.onItemClick(dirent);
      return;
    }

    // is have preview permission
    if (!this.canPreview) {
      return;
    }

    if (dirent === activeDirent) {
      this.setState({isGridSelected: false});
      if (Utils.imageCheck(dirent.name)) {
        this.props.showImagePopup(dirent);
      } else {
        this.props.onItemClick(dirent);
      }
    } else {
      this.setState({isGridSelected: false});
      this.props.onGridItemClick(this.props.dirent);
    }
  }

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

    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  onGridItemDragStart = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    let dragStartItemData = {nodeDirent: this.props.dirent, nodeParentPath: this.props.path};
    dragStartItemData = JSON.stringify(dragStartItemData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartItemData);
  }

  onGridItemDragEnter = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    if (this.props.dirent.type === 'dir') {
      this.setState({isGridDropTipShow: true});
    }
  }

  onGridItemDragOver = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onGridItemDragLeave = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.setState({isGridDropTipShow: false});
  }

  onGridItemDragDrop = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.setState({isGridDropTipShow: false});
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);
    let {nodeDirent, nodeParentPath} = dragStartItemData;
    let dropItemData = this.props.dirent;

    if (nodeDirent.name === dropItemData.name) {
      return;
    }

    if (dropItemData.type !== 'dir') {
      return;
    }

    let selectedPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    this.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
  }

  onGridItemMouseDown = (event) =>{
    this.props.onGridItemMouseDown(event);
  }

  getFileUrl = (url) => {
    let fileUrlArr = url.split('/');
    if (fileUrlArr.indexOf('48') !== -1) {
      fileUrlArr.splice(fileUrlArr.indexOf('48'), 1, '192');
    }
    let fileUrl = fileUrlArr.join('/');
    return fileUrl;
  }

  onGridItemContextMenu = (event) => {
    let dirent = this.props.dirent;
    this.props.onGridItemContextMenu(event, dirent);
  }

  render() {
    let { dirent, path } = this.props;
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
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);

    let gridClass = 'grid-file-img-link cursor-pointer';
    gridClass += this.state.isGridSelected ? ' grid-selected-active' : ' ';
    gridClass += this.state.isGridDropTipShow ? ' grid-drop-show' : ' ';

    let lockedInfo = gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', dirent.lock_owner_name);

    return (
      <Fragment>
        <li className="grid-item" onContextMenu={this.onGridItemContextMenu} onMouseDown={this.onGridItemMouseDown}>
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
              <img src={`${siteRoot}${fileUrl}`} ref={this.gridIcon} className="thumbnail" onClick={this.onItemClick} alt=""/> :
              <img src={iconUrl} ref={this.gridIcon} width="96" alt='' />
            }
            {dirent.is_locked && <img className="grid-file-locked-icon" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={lockedInfo}/>}
          </div>
          <div className="grid-file-name" onDragStart={this.onGridItemDragStart} draggable={this.canDrag} >
            {(dirent.type !== 'dir' && dirent.file_tags && dirent.file_tags.length > 0) && (
              <Fragment>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked d-inline-block align-middle">
                  {dirent.file_tags.map((fileTag, index) => {
                    let length = dirent.file_tags.length;
                    return (
                      <span className="file-tag" key={fileTag.id} style={{zIndex:length - index, backgroundColor:fileTag.color}}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </Fragment>
            )}
            {(!dirent.isDir() && !this.canPreview) ? 
              <a className={`sf-link grid-file-name-link ${this.state.isGridSelected ? 'grid-link-selected-active' : ''}`} onClick={this.onItemLinkClick}>{dirent.name}</a> :
              <a className={`grid-file-name-link ${this.state.isGridSelected ? 'grid-link-selected-active' : ''}`} href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemLinkClick}>{dirent.name}</a>
            }
          </div>
        </li>
      </Fragment>
    );
  }
}

DirentGridItem.propTypes = propTypes;
export default DirentGridItem;

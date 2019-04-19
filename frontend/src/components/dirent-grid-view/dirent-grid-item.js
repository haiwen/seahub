import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  onGridItemContextmenu: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  activeDirent: PropTypes.object,
  onGridItemMouseDown: PropTypes.func,
};

class DirentGridItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isGridSelected: false,
      isGridDropTipshow: false,
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({isGridSelected: false}, () => {
      if (nextProps.activeDirent && nextProps.activeDirent.name === nextProps.dirent.name) {
        this.setState({isGridSelected: true});
      }
    })
  }

  onItemMove = (destRepo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(destRepo, dirent, selectedPath, currentPath);
  }

  onItemClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dirent = this.props.dirent;
    if (this.props.dirent === this.props.activeDirent) {
      this.setState({isGridSelected:false})
      if (Utils.imageCheck(dirent.name)) {
        this.props.showImagePopup(dirent);
      } else {
        this.props.onItemClick(dirent);
      }
    } else {
      this.setState({isGridSelected: true})
      this.props.onDirentClick(this.props.dirent)
    }
  }

  onItemLinkClick = (e) => {
    e.preventDefault();
    const dirent = this.props.dirent;
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  onGridItemDragStart = (e) => {
    let dragStartItemData = {nodeDirent: this.props.dirent, nodeParentPath: this.props.path};
    dragStartItemData = JSON.stringify(dragStartItemData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartItemData);
  }

  onGridItemDragEnter = (e) => {
    if (this.props.dirent.type === 'dir') {
      this.setState({isGridDropTipshow: true});
    }
  }

  onGridItemDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onGridItemDragLeave = (e) => {
    this.setState({isGridDropTipshow: false});
  }

  onGridItemDragDrop = (e) => {
    this.setState({isDropTipshow: false});
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

  onGridItemContextmenu = (event) => {
    let dirent = this.props.dirent;
    this.props.onGridItemContextmenu(event, dirent);
  }
   
  render() {
    let { dirent, path } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let iconUrl = Utils.getDirentIcon(dirent);
    let fileUrl = dirent.encoded_thumbnail_src ? this.getFileUrl(dirent.encoded_thumbnail_src) : '';

    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);
    
    let gridClass = 'grid-file-img-link cursor-pointer'
    gridClass += this.state.isGridSelected ? " grid-selected-active" : " ";
    gridClass += this.state.isGridDropTipshow ? " grid-drop-show" : " ";

    return(
      <Fragment>
        <li className="grid-item" onContextMenu={this.onGridItemContextmenu} onMouseDown={this.onGridItemMouseDown}>
          <div 
            className={gridClass}
            draggable="true" 
            onClick={this.onItemClick}
            onDragStart={this.onGridItemDragStart} 
            onDragEnter={this.onGridItemDragEnter} 
            onDragOver={this.onGridItemDragOver} 
            onDragLeave={this.onGridItemDragLeave} 
            onDrop={this.onGridItemDragDrop}
          >
            {dirent.encoded_thumbnail_src ?
              <img src={`${siteRoot}${fileUrl}`} ref={this.gridIcon} className="thumbnail" onClick={this.onItemClick} alt=""/> :
              <img src={iconUrl} ref={this.gridIcon} width="96" alt='' />
            }
            {dirent.is_locked && <img className="grid-file-locked-icon" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={dirent.lock_owner_name}/>}
          </div>
          <div className="grid-file-name" onDragStart={this.onGridItemDragStart} draggable="true" >
            <a className={`grid-file-name-link ${this.state.isGridSelected ? "grid-link-selected-active" : ""}`} href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemLinkClick}>{dirent.name}</a>
          </div>
        </li>
      </Fragment>
    )
  }
}

DirentGridItem.propTypes = propTypes;
export default DirentGridItem;

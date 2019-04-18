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
  handleContextClick: PropTypes.func.isRequired,
};

class DirentGridItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gridDragImage: '',
      isDropTipshow: false,
    }
  }

  onItemClick = (e) => {
    e.preventDefault();
    
    const dirent = this.props.dirent;
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  gridDargStart = (e) => {
    // todo
  }

  gridDragEnter = (e) => {
    // todo
  }

  gridDragOver = (e) => {
    // todo
  }

  gridDragLeave = (e) => {
    // todo
  }

  gridDrop = (e) => {
    // todo
  }

  getFileUrl = (url) => {
    let fileArr = url.split('/');
    fileArr.splice(fileArr.indexOf('48'), 1, '192');
    let fileUrl = fileArr.join('/')
    return fileUrl;
  }

  onItemContextMenu = (event) => {
    this.handleContextClick(event);
  }

  handleContextClick = (event) => {
    this.props.handleContextClick(event, this.props.dirent);
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
    

    return(
      <Fragment>
        <li className="grid-item" onContextMenu={this.onItemContextMenu}>
          <div 
            className="grid-img-link cursor-pointer"
            draggable="true"
            onClick={this.onItemClick}
            onDragStart={this.gridDargStart}
            onDragEnter={this.gridDragEnter}
            onDragOver={this.gridDragOver}
            onDragLeave={this.gridDragLeave}
            onDrop={this.gridDrop}
          >
            {dirent.encoded_thumbnail_src ?
              <img src={`${siteRoot}${fileUrl}`} ref={this.gridIcon} className="thumbnail" onClick={this.onItemClick} alt="" /> :
              <img src={iconUrl} ref={this.gridIcon} width="96" alt='' />
            }
            {dirent.is_locked && <img className="grid-file-locked-icon" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={dirent.lock_owner_name}/>}
          </div>
          <div className="grid-name">
            <a className="grid-name-link" href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemClick}>{dirent.name}</a>
          </div>
        </li>
      </Fragment>
    )
  }
}

DirentGridItem.propTypes = propTypes;
export default DirentGridItem;

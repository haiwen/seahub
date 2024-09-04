import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { SeafileMetadata } from '../../metadata';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import SeafileMarkdownViewer from '../seafile-markdown-viewer';
import Loading from '../loading';

import './dir-column-file.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  hash: PropTypes.string,
  isFileLoading: PropTypes.bool.isRequired,
  isFileLoadedErr: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  content: PropTypes.string,
  viewId: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object,
  currentDirent: PropTypes.object,
};

class DirColumnFile extends React.Component {

  componentDidMount() {
    if (this.props.hash) {
      let hash = this.props.hash;
      setTimeout(function () {
        window.location.hash = hash;
      }, 500);
    }
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  };

  onOpenFile = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let newUrl = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path);
    console.log('newUrl', newUrl);
    window.open(newUrl, '_blank');
  };

  render() {
    const { isFileLoading, currentDirent } = this.props;
    const { name } = currentDirent;

    if (this.props.isFileLoadedErr) {
      return (
        <div className="message err-tip">{gettext('File does not exist.')}</div>
      );
    }

    if (this.props.content === '__sf-metadata') {
      const { repoID, currentRepoInfo, viewId } = this.props;

      return (<SeafileMetadata mediaUrl={mediaUrl} repoID={repoID} repoInfo={currentRepoInfo} viewID={viewId} />);
    }

    return (
      <Modal isOpen={true} className='seafile-markdown-viewer-modal' contentClassName='seafile-markdown-viewer-modal-content' zIndex={1046}>
        <div className='seafile-markdown-viewer-modal-header'>
          <div className='seafile-markdown-viewer-modal-header-left-name'>
            <span className='sf3-font sf3-font-info'>
              <img ref='drag_icon' src={`${siteRoot}11`} className="thumbnail cursor-pointer" alt="" /> :
            </span>
            <span>{name}</span>
          </div>
          <div className='seafile-markdown-viewer-modal-header-right-tool'>
            <span className='sf3-font sf3-font-open' onClick={this.props.onOpenFile}></span>
            <span className='sf3-font sf3-font-more'></span>
            <span className='sf3-font sf3-font-x-01' onClick={this.props.onCloseMarkdownViewDialog}></span>
          </div>
        </div>
        <ModalBody className='seafile-markdown-viewer-modal-body'>
          {/* {isFileLoading && (
            <Loading />
          )} */}
          {true && (
            <SeafileMarkdownViewer
              isTOCShow={false}
              isFileLoading={this.props.isFileLoading}
              markdownContent={this.props.content}
              lastModified = {this.props.lastModified}
              latestContributor={this.props.latestContributor}
              onLinkClick={this.props.onLinkClick}
              repoID={this.props.repoID}
              path={this.props.path}
            >
              {/* <span className='wiki-open-file position-fixed' onClick={this.onOpenFile}>
              <i className="sf3-font sf3-font-expand-arrows-alt"></i>
            </span> */}
            </SeafileMarkdownViewer>
          )}
        </ModalBody>
      </Modal>
    );
  }
}

DirColumnFile.propTypes = propTypes;

export default DirColumnFile;

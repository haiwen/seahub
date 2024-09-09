import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { SeafileMetadata } from '../../metadata';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import SeafileMarkdownViewer from '../seafile-markdown-viewer';

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
  onCloseMarkdownViewDialog: PropTypes.func
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

  onOpenFile = (e) => {
    e.preventDefault();
    let { path, repoID, currentDirent } = this.props;
    let { name } = currentDirent || {};
    let newUrl = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '/' + name;
    window.open(newUrl, '_blank');
  };

  render() {
    const { currentDirent } = this.props;
    const { name } = currentDirent || {};

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
      <Modal
        isOpen={true}
        className='seafile-markdown-viewer-modal'
        toggle={this.props.onCloseMarkdownViewDialog}
        contentClassName='seafile-markdown-viewer-modal-content'
        zIndex={1046}
      >
        <div className='seafile-markdown-viewer-modal-header'>
          <div className='seafile-markdown-viewer-modal-header-left-name'>
            <span ><img src={`${mediaUrl}img/file/256/md.png`} width='24' alt='' /></span>
            <span>{name}</span>
          </div>
          <div className='seafile-markdown-viewer-modal-header-right-tool'>
            {/* Hidden for now, operations may be added later */}
            {/* <span className='sf3-font sf3-font-more'></span> */}
            <span className='sf3-font sf3-font-open' onClick={this.onOpenFile}></span>
            <span className='sf3-font sf3-font-x-01' onClick={this.props.onCloseMarkdownViewDialog}></span>
          </div>
        </div>
        <ModalBody className='seafile-markdown-viewer-modal-body'>
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
          </SeafileMarkdownViewer>
        </ModalBody>
      </Modal>
    );
  }
}

DirColumnFile.propTypes = propTypes;

export default DirColumnFile;

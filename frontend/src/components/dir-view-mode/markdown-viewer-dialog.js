import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { siteRoot, mediaUrl } from '../../utils/constants';
import SeafileMarkdownViewer from '../seafile-markdown-viewer';

import './markdown-viewer-dialog.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
  currentDirent: PropTypes.object,
  onCloseMarkdownViewDialog: PropTypes.func
};

class MarkdownViewerDialog extends React.Component {

  onOpenFile = (e) => {
    e.preventDefault();
    let { path, repoID, currentDirent } = this.props;
    let { name } = currentDirent || {};
    let newUrl = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + (path.endsWith('/') ? '' : '/') + name;
    window.open(newUrl, '_blank');
  };

  render() {
    const { currentDirent } = this.props;
    const { name } = currentDirent || {};
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
            <span><img src={`${mediaUrl}img/file/256/md.png`} width='24' alt='' /></span>
            <span>{name}</span>
          </div>
          <div className='seafile-markdown-viewer-modal-header-right-tool'>
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

MarkdownViewerDialog.propTypes = propTypes;

export default MarkdownViewerDialog;
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import { Modal } from 'reactstrap';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
};

class FileTagsViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      usedRepoTags: [],
      currentTag: null,
      isListTaggedFileShow: false,
    };
  }

  onListTaggedFiles = (currentTag) => {
    this.setState({
      currentTag: currentTag,
      isListTaggedFileShow: !this.state.isListTaggedFileShow,
    });
  }

  onCloseDialog = () => {
    this.setState({
      isListTaggedFileShow: false
    });
  }

  render() {
    let {usedRepoTags, repoID} = this.props;

    return (
      <Fragment>
        <ul className="used-tag-list">
          {usedRepoTags.map((usedRepoTag) => {
            return (
              <li key={usedRepoTag.id} className="used-tag-item">
                <span className={`used-tag bg-${usedRepoTag.color}`}></span>
                <span className="used-tag-name" title={usedRepoTag.name}>{usedRepoTag.name}</span>
                <span className="used-tag-files" onClick={this.onListTaggedFiles.bind(this, usedRepoTag)}>
                  {usedRepoTag.fileCount > 1 ? usedRepoTag.fileCount + ' files' : usedRepoTag.fileCount + ' file'}
                </span>
              </li>
            );
          })}
        </ul>
        {this.state.isListTaggedFileShow && (
          <ModalPortal>
            <Modal isOpen={true}>
              <ListTaggedFilesDialog
                repoID={repoID}
                currentTag={this.state.currentTag}
                onClose={this.onCloseDialog}
                toggleCancel={this.onListTaggedFiles}
              />
            </Modal>
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

FileTagsViewer.propTypes = propTypes;

export default FileTagsViewer;

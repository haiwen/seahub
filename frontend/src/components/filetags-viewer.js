import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import { Modal } from 'reactstrap';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  permission: PropTypes.bool.isRequired,
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
        <ul style={{listStyle:'none', lineHeight:'40px'}}>
          {usedRepoTags.map((repoTag) => {
            return (
              <li key={repoTag.id} style={{display:'inline', margin:'auto 15px'}}>
                <span className={`file-tag bg-${repoTag.color}`}></span>
                <span className="tag-name" title={repoTag.name}>{repoTag.name}</span>
                <span className="tag-files" style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={this.onListTaggedFiles.bind(this, repoTag)}>
                  {repoTag.fileCount}{' '}{'files'}
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

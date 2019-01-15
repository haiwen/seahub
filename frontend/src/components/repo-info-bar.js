import React from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import { Modal } from 'reactstrap';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';
import { siteRoot, gettext } from '../utils/constants';
import { Utils } from '../utils/utils';

import '../css/repo-info-bar.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  drafts: PropTypes.array,
  reviews: PropTypes.array,
  draftCounts: PropTypes.number,
  reviewCounts: PropTypes.number,
};

class RepoInfoBar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
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
    let {repoID, currentPath, usedRepoTags, readmeMarkdown} = this.props;
    let href = readmeMarkdown !== null ? siteRoot + 'lib/' + repoID + '/file' + Utils.joinPath(currentPath, readmeMarkdown.name) : '';

    return (
      <div className="repo-info-bar">
        {usedRepoTags.length > 0 && (
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
        )}
        {readmeMarkdown !== null && (
          <div className="readme-file" style={{'display':'inline'}}>
            <i className="readme-flag fa fa-flag"></i>
            <a className="readme-name" href={href} target='_blank'>{readmeMarkdown.name}</a>
          </div>
        )}

        {this.props.draftCounts > 0 &&
          <div className="readme-file" style={{'display':'inline'}}>
            <i className="readme-flag sf2-icon-edit"></i>
            <span className="used-tag-name">{gettext('draft')}</span>
            <span className="used-tag-files">{this.props.draftCounts} file</span>
          </div>
        }

        {this.props.reviewCounts > 0 &&
          <div className="readme-file" style={{'display':'inline'}}>
            <i className="readme-flag sf2-icon-review"></i>
            <span className="used-tag-name">{gettext('review')}</span>
            <span className="used-tag-files">{this.props.reviewCounts} file</span>
          </div>
        }

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
      </div>
    );
  }
}

RepoInfoBar.propTypes = propTypes;

export default RepoInfoBar;

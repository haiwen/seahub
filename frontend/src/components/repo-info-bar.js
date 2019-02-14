import React from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';
import ListRepoDraftsDialog from './dialog/list-repo-drafts-dialog';
import ListRepoReviewsDialog from './dialog/list-repo-reviews-dialog';
import ReadmeDialog from './dialog/readme-dialog';
import { siteRoot, gettext } from '../utils/constants';
import { Utils } from '../utils/utils';

import '../css/repo-info-bar.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  reviewCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func.isRequired,
};

class RepoInfoBar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentTag: null,
      isListTaggedFileShow: false,
      showRepoDrafts: false,
      showRepoReviews: false,
      showReadmeDialog: false,
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

  toggleDrafts = () => {
    this.setState({
      showRepoDrafts: !this.state.showRepoDrafts 
    });
  }

  toggleReviews = () => {
    this.setState({
      showRepoReviews: !this.state.showRepoReviews 
    });
  }

  toggleReadme = () => {
    this.setState({
      showReadmeDialog: !this.state.showReadmeDialog
    });
  }

  render() {
    let {repoID, currentPath, usedRepoTags, readmeMarkdown} = this.props;
    let href = readmeMarkdown !== null ? siteRoot + 'lib/' + repoID + '/file' + Utils.joinPath(currentPath, readmeMarkdown.name) +  '?mode=edit' : '';
    let filePath = readmeMarkdown !== null ? currentPath + readmeMarkdown.name : '';
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
        <div className={(usedRepoTags.length > 0 && readmeMarkdown) ? 'file-info-list mt-1' : 'file-info-list'}>
          {(readmeMarkdown !== null && parseInt(readmeMarkdown.size) > 1) && 
            <span className="file-info" onClick={this.toggleReadme}>
              <span className="info-icon sf2-icon-readme"></span>
              <span className="used-tag-name">{readmeMarkdown.name}</span>
            </span>
          }
          {(readmeMarkdown !== null && parseInt(readmeMarkdown.size) < 2) && 
            <span className="file-info">
              <span className="info-icon sf2-icon-readme"></span>
              <a className="used-tag-name" href={href} target='_blank'>{readmeMarkdown.name}</a>
            </span>
          }
          {this.props.draftCounts > 0 &&
            <span className="file-info">
              <span className="info-icon sf2-icon-drafts"></span>
              <span className="used-tag-name">{gettext('draft')}</span>
              <span className="used-tag-files" onClick={this.toggleDrafts}>
                {this.props.draftCounts > 1 ? this.props.draftCounts + ' files' : this.props.draftCounts + ' file'}
              </span>
            </span>
          }
          {this.props.reviewCounts > 0 &&
            <span className="file-info">
              <span className="info-icon sf2-icon-review"></span>
              <span className="used-tag-name">{gettext('review')}</span>
              <span className="used-tag-files" onClick={this.toggleReviews}>
                {this.props.reviewCounts > 1 ? this.props.reviewCounts + ' files' : this.props.reviewCounts + ' file'}
              </span>
            </span>
          }
        </div>
        {this.state.isListTaggedFileShow && (
          <ModalPortal>
            <ListTaggedFilesDialog
              repoID={repoID}
              currentTag={this.state.currentTag}
              onClose={this.onCloseDialog}
              toggleCancel={this.onListTaggedFiles}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
            />
          </ModalPortal>
        )}

        {this.state.showRepoDrafts && (
          <ModalPortal>
            <ListRepoDraftsDialog
              toggle={this.toggleDrafts}
              repoID={this.props.repoID}
            />
          </ModalPortal>
        )}

        {this.state.showRepoReviews && (
          <ModalPortal>
            <ListRepoReviewsDialog
              toggle={this.toggleReviews}
              repoID={this.props.repoID}
            />
          </ModalPortal>
        )}

        {this.state.showReadmeDialog && (
          <ModalPortal>
            <ReadmeDialog
              toggleCancel={this.toggleReadme}
              repoID={repoID}
              filePath={filePath}
              href={href}
              fileName={readmeMarkdown.name}
            />
          </ModalPortal>
        )}
      </div>
    );
  }
}

RepoInfoBar.propTypes = propTypes;

export default RepoInfoBar;

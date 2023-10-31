import React from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';
import ListRepoDraftsDialog from './dialog/list-repo-drafts-dialog';
import { gettext } from '../utils/constants';

import '../css/repo-info-bar.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  draftCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func,
  onFileTagChanged: PropTypes.func,
  className: PropTypes.string,
  shareLinkToken: PropTypes.string,
  enableFileDownload: PropTypes.bool
};

class RepoInfoBar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentTag: null,
      isListTaggedFileShow: false,
      showRepoDrafts: false
    };
  }

  onListTaggedFiles = (currentTag) => {
    this.setState({
      currentTag: currentTag,
      isListTaggedFileShow: !this.state.isListTaggedFileShow
    });
  };

  onCloseDialog = () => {
    this.setState({
      isListTaggedFileShow: false
    });
  };

  toggleDrafts = () => {
    this.setState({
      showRepoDrafts: !this.state.showRepoDrafts
    });
  };

  render() {
    let { repoID, usedRepoTags, draftCounts, className } = this.props;

    // to be compatible with the existing code
    if (draftCounts === undefined) {
      draftCounts = 0;
    }

    return (
      <div className={`repo-info-bar ${className ? className : ''}`}>
        {usedRepoTags.length > 0 && (
          <ul className="used-tag-list">
            {usedRepoTags.map((usedRepoTag) => {
              return (
                <li key={usedRepoTag.id} className="used-tag-item">
                  <span className="used-tag" style={{backgroundColor:usedRepoTag.color}}></span>
                  <span className="used-tag-name" title={usedRepoTag.name}>{usedRepoTag.name}</span>
                  <button type="button" className="used-tag-files border-0 bg-transparent" onClick={this.onListTaggedFiles.bind(this, usedRepoTag)}>
                    {usedRepoTag.fileCount > 1 ? usedRepoTag.fileCount + ' files' : usedRepoTag.fileCount + ' file'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {/*<div className={usedRepoTags.length > 0 ? 'file-info-list mt-1' : 'file-info-list'}>
          {draftCounts > 0 &&
            <span className="file-info">
              <span className="info-icon sf2-icon-drafts"></span>
              <span className="used-tag-name">{gettext('draft')}</span>
              <button type="button" className="used-tag-files border-0 bg-transparent" onClick={this.toggleDrafts}>
                {draftCounts > 1 ? draftCounts + ' files' : draftCounts + ' file'}
              </button>
            </span>
          }
        </div>*/}
        {this.state.isListTaggedFileShow && (
          <ModalPortal>
            <ListTaggedFilesDialog
              repoID={repoID}
              currentTag={this.state.currentTag}
              onClose={this.onCloseDialog}
              toggleCancel={this.onListTaggedFiles}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
              onFileTagChanged={this.props.onFileTagChanged}
              shareLinkToken={this.props.shareLinkToken}
              enableFileDownload={this.props.enableFileDownload}
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

      </div>
    );
  }
}

RepoInfoBar.propTypes = propTypes;

export default RepoInfoBar;

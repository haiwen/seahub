import React from 'react';
import PropTypes from 'prop-types';
import ModalPortal from './modal-portal';
import ListTaggedFilesDialog from './dialog/list-taggedfiles-dialog';
import RepoInfoBarMigrate from './repo-info-bar-migrate';

import '../css/repo-info-bar.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
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

  render() {
    let { repoID, usedRepoTags, className, shareLinkToken } = this.props;

    return (
      <div className={`repo-info-bar ${className ? className : ''}`}>
        {usedRepoTags.length > 0 && (
          <ul className="used-tag-list">
            {usedRepoTags.map((usedRepoTag) => {
              return (
                <li key={usedRepoTag.id} className="used-tag-item">
                  <span className="used-tag" style={{ backgroundColor: usedRepoTag.color }}></span>
                  <span className="used-tag-name" title={usedRepoTag.name}>{usedRepoTag.name}</span>
                  <button type="button" className="used-tag-files border-0 bg-transparent" onClick={this.onListTaggedFiles.bind(this, usedRepoTag)}>
                    {usedRepoTag.fileCount > 1 ? usedRepoTag.fileCount + ' files' : usedRepoTag.fileCount + ' file'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {this.state.isListTaggedFileShow && (
          <ModalPortal>
            <ListTaggedFilesDialog
              repoID={repoID}
              currentTag={this.state.currentTag}
              onClose={this.onCloseDialog}
              toggleCancel={this.onListTaggedFiles}
              updateUsedRepoTags={this.props.updateUsedRepoTags}
              onFileTagChanged={this.props.onFileTagChanged}
              shareLinkToken={shareLinkToken}
              enableFileDownload={this.props.enableFileDownload}
            />
          </ModalPortal>
        )}
        {!shareLinkToken && <RepoInfoBarMigrate />}
      </div>
    );
  }
}

RepoInfoBar.propTypes = propTypes;

export default RepoInfoBar;

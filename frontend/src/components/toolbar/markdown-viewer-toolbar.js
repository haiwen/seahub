import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { IconButton, ButtonGroup, CollabUsersButton } from '@seafile/seafile-editor/dist/components/topbarcomponent/editorToolBar';
import FileInfo from '@seafile/seafile-editor/dist/components/topbarcomponent/file-info';

const propTypes = {
  isDocs: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired,
  editorUtilities: PropTypes.object.isRequired,
  collabUsers: PropTypes.array.isRequired,
  fileInfo: PropTypes.object.isRequired,
  fileTagList: PropTypes.array.isRequired,
  relatedFiles: PropTypes.array.isRequired,
  toggleShareLinkDialog: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  toggleNewDraft: PropTypes.func.isRequired,
  toggleStar: PropTypes.func.isRequired,
  backToParentDirectory: PropTypes.func.isRequired,
  openDialogs: PropTypes.func.isRequired,
  showFileHistory: PropTypes.bool.isRequired,
  toggleHistory: PropTypes.func.isRequired,
  commentsNumber: PropTypes.number.isRequired,
  toggleCommentList: PropTypes.func.isRequired,
};

class MarkdownViewerToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  renderFirstToolbar() {
    return (
      <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
        <FileInfo toggleStar={this.props.toggleStar} editorUtilities={this.props.editorUtilities}
          fileInfo={this.props.fileInfo}/>
        {(this.props.hasDraft && !this.props.isDraft) &&
          <div className='seafile-btn-view-review'>
            <div className='tag tag-green'>{gettext('This file is in draft stage.')}
              <a className="ml-2" onMouseDown={this.props.editorUtilities.goDraftPage}>{gettext('View Draft')}</a></div>
          </div>
        }
        <div className="topbar-btn-container">
          { (!this.props.hasDraft && !this.props.isDraft && this.props.isDocs) &&
            <button onMouseDown={this.props.toggleNewDraft} className="btn btn-success btn-new-draft">
              {gettext('New Draft')}</button>
          }
          {this.props.collabUsers.length > 0 && <CollabUsersButton className={'collab-users-dropdown'}
            users={this.props.collabUsers} id={'usersButton'} />}
          <ButtonGroup>
            <IconButton id={'shareBtn'} text={gettext('Share')} icon={'fa fa-share-alt'}
              onMouseDown={this.props.toggleShareLinkDialog}/>
            {
              this.props.commentsNumber > 0 ?
                <button className="btn btn-icon btn-secondary btn-active" id="commentsNumber" type="button"
                  data-active="false" onMouseDown={this.props.toggleCommentList}>
                  <i className="fa fa-comments"></i>{' '}<span>{this.props.commentsNumber}</span>
                </button>
                :
                <IconButton id={'commentsNumber'} text={gettext('Comments')} icon={'fa fa-comments'} onMouseDown={this.props.toggleCommentList}/>
            }
            <IconButton text={gettext('Back to parent directory')} id={'parentDirectory'}
              icon={'fa fa-folder-open'} onMouseDown={this.props.backToParentDirectory}/>
            {
              (!this.props.hasDraft && this.props.fileInfo.permission === 'rw')? <IconButton text={gettext('Edit')}
                id={'editButton'} icon={'fa fa-edit'} onMouseDown={this.props.onEdit}/>: null
            }
            {
              this.props.showFileHistory && <IconButton id={'historyButton'}
                text={gettext('File History')} onMouseDown={this.props.toggleHistory} icon={'fa fa-history'}/>
            }
          </ButtonGroup>
        </div>
      </div>
    );
  }

  renderSecondToolbar() {
    const { relatedFiles, fileTagList } = this.props;
    const openDialogs = this.props.openDialogs;
    let relatedFileString = '';
    if (relatedFiles) {
      const length = relatedFiles.length;
      if (length === 1) relatedFileString = gettext('related file');
      else if (length > 1) relatedFileString = gettext('related files');
    }
    return(
      <div className="sf-md-viewer-topbar-second d-flex justify-content-center">
        {(fileTagList) && (fileTagList.length > 0 ?
          <ul className="sf-files-tags">
            {
              fileTagList.map((item, index=0) => {
                return (
                  <li key={index} className='sf-files-tag'>
                    <span className="file-tag-icon" style={{backgroundColor: item.tag_color}}></span>
                    <span className="file-tag-name" title={item.tag_name}>{item.tag_name}</span>
                  </li>
                );
              })
            }
            <li className='sf-files-tag'><span className="file-tag-name"
              onClick={openDialogs.bind(this, 'tags')}>{gettext('Edit')}</span></li>
          </ul>
          :
          <span className="no-file-tag edit-related-file"
            onClick={openDialogs.bind(this, 'tags')}>{gettext('No tags')}</span>
        )}
        {relatedFiles &&
          <div className="sf-related-files-bar">
            {relatedFiles.length === 0 ?
              <span className="edit-related-file no-related-file"
                onClick={openDialogs.bind(this, 'related_files')}>{gettext('No related files')}</span>:
              <React.Fragment>
                <a href="#sf-releted-files">{relatedFiles.length}{' '}{relatedFileString}</a>
                <span className="edit-related-file" onClick={openDialogs.bind(this, 'related_files')}>
                  {gettext('Edit')}</span>
              </React.Fragment>
            }
          </div>
        }
      </div>
    );
  }

  render() {
    return (
      <div className="sf-md-viewer-topbar">
        {this.renderFirstToolbar()}
        {this.renderSecondToolbar()}
      </div>
    );
  }
}

MarkdownViewerToolbar.propTypes = propTypes;

export default MarkdownViewerToolbar;

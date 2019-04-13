import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { IconButton, ButtonGroup, CollabUsersButton } from '@seafile/seafile-editor/dist/components/topbarcomponent/editorToolBar';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import FileInfo from '@seafile/seafile-editor/dist/components/topbarcomponent/file-info';

const propTypes = {
  isDocs: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired,
  editorUtilities: PropTypes.object.isRequired,
  collabUsers: PropTypes.array.isRequired,
  fileInfo: PropTypes.object.isRequired,
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
  editorMode: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  contentChanged: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
};

const MoreMenuPropTypes = {
  readOnly: PropTypes.bool.isRequired,
  openDialogs: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  editorMode: PropTypes.string.isRequired
}

class MoreMenu extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false,
      dropdownOpen:false
    };
  }

  tooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen:!this.state.dropdownOpen });
  }

  render() {
    const editorMode = this.props.editorMode;
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-lg-1">
        <DropdownToggle id="moreButton">
          <i className="fa fa-ellipsis-v"/>
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target="moreButton" placement='bottom' isOpen={this.state.tooltipOpen}>{gettext('More')}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className="drop-list" right={true}>
          {(!this.props.readOnly && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'plain')}>{gettext('Switch to plain text editor')}</DropdownItem>}
          {(!this.props.readOnly && editorMode === 'plain') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'rich')}>{gettext('Switch to rich text editor')}</DropdownItem>}
          {(this.props.openDialogs && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.openDialogs.bind(this, 'help')}>{gettext('Help')}</DropdownItem>
          }
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;


class MarkdownViewerToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let { contentChanged, saving } = this.props;

    if (this.props.editorMode === 'rich') {
      return (
        <div className="sf-md-viewer-topbar">
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
                  this.props.showFileHistory && <IconButton id={'historyButton'}
                    text={gettext('File History')} onMouseDown={this.props.toggleHistory} icon={'fa fa-history'}/>
                }
                { saving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <IconButton text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'}  disabled={!contentChanged} 
                    onMouseDown={window.seafileEditor && window.seafileEditor.onPlainEditorSave} isActive={contentChanged}/>
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.props.editorMode === 'plain') {
      return (
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
            <FileInfo toggleStar={this.props.toggleStar} editorUtilities={this.props.editorUtilities}
              fileInfo={this.props.fileInfo}/>
            <div className="topbar-btn-container">
              {this.props.collabUsers.length > 0 && <CollabUsersButton className={'collab-users-dropdown'}
                users={this.props.collabUsers} id={'usersButton'} />}
              <ButtonGroup>
                { saving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <IconButton id={'saveButton'} text={gettext('Save')} icon={'fa fa-save'} onMouseDown={window.seafileEditor && window.seafileEditor.onPlainEditorSave} disabled={!contentChanged} isActive={contentChanged} />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
              />
            </div>
          </div>
        </div>
      );
    }
  }
}

MarkdownViewerToolbar.propTypes = propTypes;

export default MarkdownViewerToolbar;

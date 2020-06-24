import React from 'react';
import PropTypes from 'prop-types';
import { gettext, canGenerateShareLink } from '../../utils/constants';
import { IconButton, ButtonGroup, CollabUsersButton } from '@seafile/seafile-editor/dist/components/topbar-component/editor-toolbar';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import FileInfo from '@seafile/seafile-editor/dist/components/topbar-component/file-info';


class MoreMenu extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false,
      dropdownOpen: false
    };
  }

  tooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  render() {
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-lg-1">
        <DropdownToggle id="moreButton">
          <i className="fa fa-ellipsis-v" />
          <Tooltip toggle={this.tooltipToggle} delay={{ show: 0, hide: 0 }} target="moreButton" placement='bottom' isOpen={this.state.tooltipOpen}>{gettext('More')}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className="drop-list" right={true}>
          <DropdownItem onMouseDown={this.props.openDialogs.bind(this, 'help')}>{gettext('Help')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}


class CDOCTopbar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let { contentChanged, saving } = this.props;
    return (
      <div className="sf-md-viewer-topbar">
        <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
          <FileInfo
            toggleStar={this.props.toggleStar}
            editorApi={this.props.editorApi}
            fileInfo={this.props.fileInfo}
            showDraftSaved={this.props.showDraftSaved}
          />
          <div className="topbar-btn-container">
            {this.props.collabUsers.length > 0 && <CollabUsersButton className={'collab-users-dropdown'}
              users={this.props.collabUsers} id={'usersButton'} />}
            <ButtonGroup>
              {canGenerateShareLink &&
                <IconButton id={'shareBtn'} text={gettext('Share')} icon={'fa fa-share-alt'}
                  onMouseDown={this.props.toggleShareLinkDialog} />
              }
              <IconButton text={gettext('Back to parent directory')} id={'parentDirectory'}
                icon={'fa fa-folder-open'} onMouseDown={this.props.backToParentDirectory} />
              {
                this.props.showFileHistory && <IconButton id={'historyButton'}
                  text={gettext('File History')} onMouseDown={this.props.toggleHistory} icon={'fa fa-history'} />
              }
              {saving ?
                <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                  <i className={'fa fa-spin fa-spinner'} /></button>
                :
                <IconButton text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'} disabled={!contentChanged}
                  onMouseDown={this.props.onSave} isActive={contentChanged} />
              }
            </ButtonGroup>
            <MoreMenu
              openDialogs={this.props.openDialogs}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default CDOCTopbar;

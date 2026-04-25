import React from 'react';
import PropTypes from 'prop-types';
import { EXTERNAL_EVENTS, EventBus } from '@seafile/seafile-editor';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, canGenerateShareLink } from '../../../utils/constants';
import Icon from '../../../components/icon';
import SfTooltip from '@/components/tooltip';

const { canDownloadFile } = window.app.pageOptions;

const MoreMenuPropTypes = {
  readOnly: PropTypes.bool.isRequired,
  openDialogs: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  editorMode: PropTypes.string.isRequired,
  isSmallScreen: PropTypes.bool,
  toggleShareLinkDialog: PropTypes.func,
  openParentDirectory: PropTypes.func,
  showFileHistory: PropTypes.bool,
  toggleHistory: PropTypes.func,
  onCommentPanelToggle: PropTypes.func,
};

class MoreMenu extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false
    };
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  onHelpModuleToggle = (event) => {
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EXTERNAL_EVENTS.ON_HELP_INFO_TOGGLE, true);
  };

  downloadFile = () => {
    location.href = '?dl=1';
  };

  render() {
    const editorMode = this.props.editorMode;
    const isSmall = this.props.isSmallScreen;
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down">
        <DropdownToggle
          className='sf-md-header-more-tool'
          id="moreButton"
          tag="div"
          role="button"
          tabIndex="0"
          aria-label={gettext('More operations')}
        >
          <Icon symbol="more-level" />
          <SfTooltip target="moreButton" placement='bottom'>{gettext('More')}</SfTooltip>
        </DropdownToggle>
        <DropdownMenu className="drop-list">
          {(!this.props.readOnly && editorMode === 'rich') &&
            <DropdownItem onClick={this.props.onEdit.bind(this, 'plain')}>{gettext('Switch to plain text editor')}</DropdownItem>}
          {(!this.props.readOnly && editorMode === 'plain') &&
            <DropdownItem onClick={this.props.onEdit.bind(this, 'rich')}>{gettext('Switch to rich text editor')}</DropdownItem>}
          {!isSmall && this.props.showFileHistory &&
            <DropdownItem onClick={this.props.toggleHistory}>{gettext('History')}</DropdownItem>}
          {(this.props.openDialogs && editorMode === 'rich') &&
            <DropdownItem onClick={this.onHelpModuleToggle}>{gettext('Help')}</DropdownItem>
          }
          {isSmall && this.props.onCommentPanelToggle && <DropdownItem onClick={this.props.onCommentPanelToggle}>{gettext('Comment')}</DropdownItem>}
          {isSmall && canGenerateShareLink && <DropdownItem onClick={this.props.toggleShareLinkDialog}>{gettext('Share')}</DropdownItem>}
          {isSmall && canDownloadFile &&
            <DropdownItem onClick={this.downloadFile}>{gettext('Download')}</DropdownItem>
          }
          <div className='sf-operator-folder-divider'></div>
          <DropdownItem onClick={this.props.openParentDirectory}>{gettext('Open parent folder')}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;

export default MoreMenu;

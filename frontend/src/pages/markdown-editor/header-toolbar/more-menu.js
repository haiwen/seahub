import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import { gettext, canGenerateShareLink } from '../../../utils/constants';

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
};

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

  downloadFile = () => {
    location.href = '?dl=1';
  }

  render() {
    const editorMode = this.props.editorMode;
    const isSmall = this.props.isSmallScreen;
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-1">
        <DropdownToggle id="moreButton" aria-label={gettext('More Operations')}>
          <i className="fa fa-ellipsis-v"/>
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target="moreButton" placement='bottom' isOpen={this.state.tooltipOpen}>{gettext('More')}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className="drop-list" right={true}>
          {(!this.props.readOnly && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'plain')}>{gettext('Switch to plain text editor')}</DropdownItem>}
          {(!this.props.readOnly && editorMode === 'plain') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'rich')}>{gettext('Switch to rich text editor')}</DropdownItem>}
          {!isSmall && this.props.showFileHistory &&
            <DropdownItem onMouseDown={this.props.toggleHistory}>{gettext('History')}</DropdownItem>}
          {(this.props.openDialogs && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.openDialogs.bind(this, 'help')}>{gettext('Help')}</DropdownItem>
          }
          {isSmall && <DropdownItem onMouseDown={this.props.openParentDirectory}>{gettext('Open parent directory')}</DropdownItem>}
          {isSmall && canGenerateShareLink && <DropdownItem onMouseDown={this.props.toggleShareLinkDialog}>{gettext('Share')}</DropdownItem>}
          {(isSmall && this.props.showFileHistory) &&
            <DropdownItem onMouseDown={this.props.toggleHistory}>{gettext('History')}</DropdownItem>
          }
          {isSmall && canDownloadFile &&
            <DropdownItem onClick={this.downloadFile}>{gettext('Download')}</DropdownItem>
          }
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;

export default MoreMenu;

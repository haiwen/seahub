import React from 'react';
import PropTypes from 'prop-types';
import { EXTERNAL_EVENTS, EventBus } from '@seafile/seafile-editor';
import { gettext, canGenerateShareLink } from '../../../utils/constants';
import Icon from '../../../components/icon';
import Tooltip from '@/components/tooltip';
import CustomDropdown from '../../../components/dropdown';

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
    const menuItems = [];
    if (!this.props.readOnly && editorMode === 'rich') {
      menuItems.push({ key: 'switch-plain', label: gettext('Switch to plain text editor'), onClick: this.props.onEdit.bind(this, 'plain') });
    }
    if (!this.props.readOnly && editorMode === 'plain') {
      menuItems.push({ key: 'switch-rich', label: gettext('Switch to rich text editor'), onClick: this.props.onEdit.bind(this, 'rich') });
    }
    if (!isSmall && this.props.showFileHistory) {
      menuItems.push({ key: 'history', label: gettext('History'), onClick: this.props.toggleHistory });
    }
    if (this.props.openDialogs && editorMode === 'rich') {
      menuItems.push({ key: 'help', label: gettext('Help'), onClick: this.onHelpModuleToggle });
    }
    if (isSmall && this.props.onCommentPanelToggle) {
      menuItems.push({ key: 'comment', label: gettext('Comment'), onClick: this.props.onCommentPanelToggle });
    }
    if (isSmall && canGenerateShareLink) {
      menuItems.push({ key: 'share', label: gettext('Share'), onClick: this.props.toggleShareLinkDialog });
    }
    if (isSmall && canDownloadFile) {
      menuItems.push({ key: 'download', label: gettext('Download'), onClick: this.downloadFile });
    }
    menuItems.push('Divider');
    menuItems.push({ key: 'open-parent-folder', label: gettext('Open parent folder'), onClick: this.props.openParentDirectory });

    return (
      <CustomDropdown
        target="moreButton"
        items={menuItems}
        trigger={(
          <>
            <Icon symbol="more-level" />
            <Tooltip target="moreButton" placement='bottom'>{gettext('More')}</Tooltip>
          </>
        )}
        triggerClassName="sf-md-header-more-tool"
        menuClassName="drop-list"
        menuPortal={false}
      />
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;

export default MoreMenu;

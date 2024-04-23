import React from 'react';
// import PropTypes from 'prop-types';
import { FormGroup, Label, Tooltip } from 'reactstrap';
import IconSettingsPopover from './icon-settings-popover';
import { gettext, mediaUrl } from '../../../../utils/constants';

import './app-settings-dialog-icon-color.css';

class AppSettingsDialogIconColor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowIconPopover: false,
      isTooltipOpen: false,
    };
    this.renameRef = React.createRef();
  }

  onIconPopoverToggle = () => {
    this.setState({ isShowIconPopover: !this.state.isShowIconPopover });
  };

  onRenameIconToggle = () => {
    this.setState({ isTooltipOpen: !this.state.isTooltipOpen });
  };

  render() {
    const iconName = 'default';
    return (
      <div className="app-settings-dialog-icon-color">
        <FormGroup className="app-settings-dialog-theme-color">
          <Label>{gettext('Wiki icon')}</Label>
          <div className='position-relative'>
            <img src={`${mediaUrl}img/wiki/${iconName}.png`} width={60} height={60} alt="" />
            <div className="theme-color-backdrop" onClick={this.onIconPopoverToggle} id='app-settings-dialog-icon-backdrop'>
              <span className="dtable-font dtable-icon-rename" ref={this.renameRef}></span>
            </div>
            <Tooltip
              placement="bottom"
              isOpen={this.state.isTooltipOpen}
              target={this.renameRef}
              toggle={this.onRenameIconToggle}
            >
              {gettext('Change icon')}
            </Tooltip>
          </div>
        </FormGroup>
        {this.state.isShowIconPopover &&
          <IconSettingsPopover
            onToggle={this.onIconPopoverToggle}
            targetId='app-settings-dialog-icon-backdrop'
          />
        }
      </div>
    );
  }
}

AppSettingsDialogIconColor.propTypes = {
};

export default AppSettingsDialogIconColor;

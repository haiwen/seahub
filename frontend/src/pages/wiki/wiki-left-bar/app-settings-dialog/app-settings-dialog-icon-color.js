import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Tooltip, Button } from 'reactstrap';
import IconSettingsPopover from './icon-settings-popover';
import { gettext, mediaUrl } from '../../../../utils/constants';
import { getIconURL } from '../../utils';

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
    const { wiki_icon } = this.props.config;
    const src = wiki_icon ? getIconURL(this.props.repoId, wiki_icon) : `${mediaUrl}img/wiki/default.png`;
    return (
      <div className="app-settings-dialog-icon-color">
        <FormGroup className="app-settings-dialog-theme-color">
          <Label>{gettext('Wiki icon')}</Label>
          <div className='position-relative'>
            {wiki_icon ?
              <>
                <img src={src} width={60} height={60} alt="" />
                <div className="theme-color-backdrop" onClick={this.onIconPopoverToggle} id='app-settings-dialog-icon-backdrop'>
                  <span className="iconfont icon-edit" ref={this.renameRef} style={{color: '#fff', fontSize: '24px'}}></span>
                </div>
              </>
              :
              <div onClick={this.onIconPopoverToggle} id='app-settings-dialog-icon-backdrop'>
                <Button onClick={this.onIconPopoverToggle} size="sm" color="primary">{gettext('Select icon')}</Button>
              </div>
            }
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
            config={this.props.config}
            updateConfig={this.props.updateConfig}
            repoId={this.props.repoId}
          />
        }
      </div>
    );
  }
}

AppSettingsDialogIconColor.propTypes = {
  config: PropTypes.object.isRequired,
  repoId: PropTypes.string.isRequired,
  updateConfig: PropTypes.func.isRequired,
};

export default AppSettingsDialogIconColor;

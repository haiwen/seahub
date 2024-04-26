import React from 'react';
import PropTypes from 'prop-types';
import AppSettingsDialog from './app-settings-dialog/index';
import Icon from './wiki-left-bar-icon.jsx';
import { gettext } from '../../../utils/constants';

import './wiki-left-bar.css';

export default class WikiLeftBar extends React.Component {

  static propTypes = {
    config: PropTypes.object.isRequired,
    repoId: PropTypes.string.isRequired,
    updateConfig: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowSettingsDialog: false,
    };
  }

  openPreviewApp = () => {
    window.open(window.location.href.replace('/published/edit/', '/published/'));
  };

  openAppSettingsDialog = () => {
    this.setState({ isShowSettingsDialog: true });
  };

  closeAppSettingsDialog = () => {
    this.setState({ isShowSettingsDialog: false });
  };

  render() {
    return (
      <div className="seatable-app-universal-left-bar">
        <Icon onClick={this.openAppSettingsDialog} iconClass="wiki-settings" tipText={gettext('Settings')}/>
        <Icon onClick={this.openPreviewApp} iconClass="wiki-preview" tipText={gettext('Go to wiki page to preview')}/>
        {this.state.isShowSettingsDialog &&
          <AppSettingsDialog
            toggle={this.closeAppSettingsDialog}
            config={this.props.config}
            repoId={this.props.repoId}
            updateConfig={this.props.updateConfig}
          />
        }
      </div>
    );
  }
}

import React from 'react';
import PropTypes from 'prop-types';
import { Nav, NavItem, NavLink, TabContent, TabPane, PopoverBody } from 'reactstrap';
import SeahubPopover from '../../../../components/common/seahub-popover';
import { gettext } from '../../../../utils/constants';
import AppSettingsDialogIcons from './app-settings-dialog-icons';
import AppSettingsDialogCustomIcon from './app-settings-dialog-custom-icon';

import './icon-settings-popover.css';

export default class IconSettingsPopover extends React.Component {

  static propTypes = {
    targetId: PropTypes.string.isRequired,
    onToggle: PropTypes.func.isRequired,
    config: PropTypes.object.isRequired,
    updateConfig: PropTypes.func.isRequired,
    repoId: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'system',
    };
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  };

  onEnter = (e) => {
    e.preventDefault();
    this.props.onToggle();
  };

  renderContent = () => {
    let { activeTab } = this.state;
    return (
      <>
        <div className="app-icon-settings-popover-nav">
          <Nav className="w-100">
            <NavItem className="w-50">
              <NavLink
                className={activeTab === 'system' ? 'active w-100' : 'w-100'}
                onClick={this.toggle.bind(this, 'system')}
              >
                {gettext('System icon')}
              </NavLink>
            </NavItem>
            <NavItem className="w-50">
              <NavLink
                className={activeTab === 'custom' ? 'active w-100' : 'w-100'}
                onClick={this.toggle.bind(this, 'custom')}
              >
                {gettext('Custom icon')}
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="app-icon-settings-popover-main">
          <TabContent activeTab={activeTab}>
            <TabPane tabId='custom'>
              <AppSettingsDialogCustomIcon
                onToggle={this.props.onToggle}
                config={this.props.config}
                updateConfig={this.props.updateConfig}
                repoId={this.props.repoId}
              />
            </TabPane>
            <TabPane tabId='system'>
              <AppSettingsDialogIcons
                onToggle={this.props.onToggle}
                config={this.props.config}
                updateConfig={this.props.updateConfig}
              />
            </TabPane>
          </TabContent>
        </div>
      </>
    );
  };

  render() {
    return (
      <SeahubPopover
        placement='bottom-start'
        target={this.props.targetId}
        hideSeahubPopover={this.props.onToggle}
        hideSeahubPopoverWithEsc={this.props.onToggle}
        onEnter={this.onEnter}
        hideArrow={true}
        popoverClassName="dtable-icon-settings-popover"
      >
        <PopoverBody className="p-0">
          {this.renderContent()}
        </PopoverBody>
      </SeahubPopover>
    );
  }
}

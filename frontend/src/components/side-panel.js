import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import MainSideNav from './main-side-nav';
import GuestMainSideNav from './guest-main-side-nav';
import SideNavFooter from './side-nav-footer';
import { isGuest, canUseExRepos } from "../utils/constants";

const propTypes = {
  isSidePanelClosed: PropTypes.bool.isRequired,
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
  tabItemClick: PropTypes.func.isRequired,
  draftCounts: PropTypes.number,
};

class SidePanel extends React.Component {

  render() {
    let showMainSideNav = false;
    let showGuestMainSideNav = false;
    let showEmpty = false;

    if (!isGuest) {
        showMainSideNav = true;
    } else if (canUseExRepos) {
        showGuestMainSideNav = true;
    } else {
        showEmpty = true;
    }

    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
            {showMainSideNav && <MainSideNav tabItemClick={this.props.tabItemClick} currentTab={this.props.currentTab} draftCounts={this.props.draftCounts}/>}
            {showGuestMainSideNav && <GuestMainSideNav tabItemClick={this.props.tabItemClick} currentTab={this.props.currentTab} draftCounts={this.props.draftCounts}/>}
        </div>
        <div className="side-panel-footer">
          <SideNavFooter />
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;

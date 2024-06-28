import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import MainSideNav from './main-side-nav';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCloseSidePanel: PropTypes.func,
  tabItemClick: PropTypes.func,
  children: PropTypes.object,
  showLogoOnlyInMobile: PropTypes.bool,
  isSidePanelFolded: PropTypes.bool,
  toggleFoldSideNav: PropTypes.func
};

class SidePanel extends React.Component {

  render() {
    const { children, isSidePanelFolded, showLogoOnlyInMobile = false } = this.props;
    return (
      <div className={`side-panel ${isSidePanelFolded ? 'side-panel-folded' : ''} ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className={`side-panel-north ${showLogoOnlyInMobile ? 'd-md-none' : ''}`}>
          <Logo onCloseSidePanel={this.props.onCloseSidePanel} />
        </div>
        <div className="side-panel-center">
          {children ? children :
            <MainSideNav
              tabItemClick={this.props.tabItemClick}
              currentTab={this.props.currentTab}
              isSidePanelFolded={isSidePanelFolded}
              toggleFoldSideNav={this.props.toggleFoldSideNav}
            />
          }
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;

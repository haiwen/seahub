import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../utils/utils';
import Logo from './logo';
import MainSideNav from './main-side-nav';
import { SIDE_PANEL_FOLDED_WIDTH } from '../constants';

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
    const style = isSidePanelFolded ? { flexBasis: SIDE_PANEL_FOLDED_WIDTH } : {};
    return (
      <div className={classnames('side-panel', { 'side-panel-folded': isSidePanelFolded, 'left-zero': !this.props.isSidePanelClosed })} style={style}>
        <div className={'side-panel-north'}>
          {showLogoOnlyInMobile && !Utils.isDesktop() && <Logo onCloseSidePanel={this.props.onCloseSidePanel} />}
        </div>
        <div className="side-panel-center">
          {children ? children : (
            <MainSideNav
              tabItemClick={this.props.tabItemClick}
              currentTab={this.props.currentTab}
              isSidePanelFolded={isSidePanelFolded}
              toggleFoldSideNav={this.props.toggleFoldSideNav}
            />
          )}
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;

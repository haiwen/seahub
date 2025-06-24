import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import MediaQuery from 'react-responsive';
import Logo from './logo';
import MainSideNav from './main-side-nav';
import MainSideNavFolded from './main-side-nav-folded';
import { SIDE_PANEL_FOLDED_WIDTH } from '../constants';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCloseSidePanel: PropTypes.func,
  tabItemClick: PropTypes.func,
  children: PropTypes.object,
  style: PropTypes.object,
  eventBus: PropTypes.object,
  isSidePanelFolded: PropTypes.bool,
  toggleFoldSideNav: PropTypes.func
};

class SidePanel extends React.Component {

  render() {
    const { children, isSidePanelFolded, style, eventBus, isSidePanelClosed } = this.props;
    return (
      <div
        className={classnames('side-panel', { 'side-panel-folded': isSidePanelFolded, 'left-zero': !isSidePanelClosed })}
        style={isSidePanelFolded ? { flexBasis: SIDE_PANEL_FOLDED_WIDTH } : style}
      >
        <MediaQuery query="(max-width: 767.8px)">
          <div className='side-panel-north'>
            <Logo onCloseSidePanel={this.props.onCloseSidePanel} />
          </div>
        </MediaQuery>
        <div className="side-panel-center">
          {children ? children : null}
          {(!children && !isSidePanelFolded) &&
            <MainSideNav
              tabItemClick={this.props.tabItemClick}
              currentTab={this.props.currentTab}
              isSidePanelFolded={isSidePanelFolded}
              toggleFoldSideNav={this.props.toggleFoldSideNav}
            />
          }
          {(!children && isSidePanelFolded) &&
            <MainSideNavFolded
              tabItemClick={this.props.tabItemClick}
              currentTab={this.props.currentTab}
              toggleFoldSideNav={this.props.toggleFoldSideNav}
              eventBus={eventBus}
            />
          }
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;

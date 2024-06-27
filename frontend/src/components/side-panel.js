import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import MainSideNav from './main-side-nav';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onCloseSidePanel: PropTypes.func,
  tabItemClick: PropTypes.func,
  children: PropTypes.object
};

class SidePanel extends React.Component {

  render() {
    const { children } = this.props;
    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          {children ?
            children :
            <MainSideNav tabItemClick={this.props.tabItemClick} currentTab={this.props.currentTab} />
          }
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;

import React from 'react';
import Logo from './logo';
import MainSideNav from './main-side-nav';
import SideNavFooter from './side-nav-footer';


class SidePanel extends React.Component {

  render() {
    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          <MainSideNav currentTab={this.props.currentTab}/>
        </div>
        <div className="side-panel-footer">
          <SideNavFooter />
        </div>
      </div>
    );
  }
}

export default SidePanel;

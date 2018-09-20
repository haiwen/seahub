import React from 'react';
import Logo from './logo';
import MainSideNav from './main-side-nav';
import SideNavFooter from './side-nav-footer';


class SidePanel extends React.Component {

  onCloseSidePanel = () => {
    //todos;
  }

  render() {
    return (
      <div className="side-panel">
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.onCloseSidePanel}/>
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

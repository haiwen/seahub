import React from 'react';
import Logo from '../../components/logo';
import MainSideNav from '../../components/main-side-nav';
import SideNavFooter from '../../components/side-nav-footer';


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
          <MainSideNav />
        </div>
        <div className="side-panel-footer">
          <SideNavFooter />
        </div>
      </div>
    );
  }
}

export default SidePanel;

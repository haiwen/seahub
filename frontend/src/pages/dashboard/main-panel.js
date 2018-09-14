import React, { Component } from 'react';
import FilesActivities from '../../components/files-activities';

class MainPanel extends Component {
  constructor(props) {
    super(props);
  }

  onMenuClick = () => {
    this.props.isOpen();
  }


  render() {
    const { children } = this.props
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-top panel-top">
        <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
        <div className="common-toolbar">
          {children}
        </div>
      </div>
      <FilesActivities />
    </div>
    )
  }
}

export default MainPanel;

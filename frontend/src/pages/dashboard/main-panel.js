import React, { Component } from 'react';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import FilesActivities from '../../components/files-activities';

class MainPanel extends Component {
  constructor(props) {
    super(props);
  }

  onMenuClick = () => {
    this.props.isOpen();
  }
  
  onSearchedClick = () => {
    //todos;
  }


  render() {
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-top panel-top">
        <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
        <CommonToolbar onSearchedClick={this.onSearchedClick}/>
      </div>
      <FilesActivities />
    </div>
    )
  }
}

export default MainPanel;

import React from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './pages/dtable/side-panel';
import MainPanel from './pages/dtable/main-panel';

import './css/layout.css';
import './css/side-panel.css';
import './css/dtable.css';

class AppDTable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'dtable',
    }
  }

  componentDidMount() {
    const seletedTabs = ['apps', 'templetes'];
    let paths = location.href.split('/');
    let tab = paths[paths.indexOf('dtable') + 1];
    let currentTab = seletedTabs.indexOf(tab) > -1 ? tab : 'dtable';
    this.setState({currentTab: currentTab});
  }

  onTabClick = (tab) => {
    if (tab !== this.state.currentTab) {
      this.setState({currentTab: tab});
    }
  }

  render() {
    return (
      <div id="main">
        <SidePanel currentTab={this.state.currentTab} onTabClick={this.onTabClick}></SidePanel>
        <MainPanel></MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <AppDTable />,
  document.getElementById('wrapper')
);

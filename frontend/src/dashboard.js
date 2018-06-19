import React, { Component } from 'react';
import ReactDOM from 'react-dom';
//import FilesActivities from './components/FilesActivities';
//import SideNav from './components/SideNav';
//import Header from './components/Header'
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';

class DashBoard extends Component {
  render() {
    return (
      <div id="main" className="row main-content flex-auto o-hidden d-flex ">
        <SidePanel />
        <MainPanel />
      </div>
    )
  }
}

ReactDOM.render (
  <DashBoard />,
  document.getElementById('wrapper')
)

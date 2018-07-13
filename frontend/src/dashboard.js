import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './components/SidePanel';
import MainPanel from './components/MainPanel';

class DashBoard extends Component {
  render() {
    return (
      <div id="main" className="container-fluid w100 flex-auto ovhd d-flex fd-col">
        <div className="row main-content flex-auto ovhd d-flex">
          <SidePanel />
          <MainPanel />
        </div>
      </div>
    )
  }
}

ReactDOM.render(
  <DashBoard />,
  document.getElementById('wrapper')
);

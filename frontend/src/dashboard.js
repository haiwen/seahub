import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './pages/dashboard/side-panel';
import MainPanel from './pages/dashboard/main-panel';

import Account from './components/account';
import Notification from './components/Notification';

import { SeafileAPI } from './seafile-api';
import cookie from 'react-cookies';

import 'seafile-ui';
import './css/dashboard.css';

const siteRoot = window.app.config.siteRoot;

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('csrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

class DashBoard extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    }
  }

  isOpen = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    })
  }

  render() {
    return (
      <div id="main">
          <SidePanel isOpen={this.state.isOpen} toggleClose={this.isOpen} seafileAPI={seafileAPI}/>
          <MainPanel isOpen={this.isOpen} seafileAPI={seafileAPI} >
            <Notification seafileAPI={seafileAPI} />
            <Account seafileAPI={seafileAPI}/>
          </MainPanel>
      </div>
    )
  }
}

ReactDOM.render(
  <DashBoard />,
  document.getElementById('wrapper')
);

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './components/sidenav';
import MainPanel from './components/maincontent';

import Account from './components/account';
import Notification from './components/Notification';

import { SeafileAPI } from './seafile-api';
import 'seafile-ui';
import cookie from 'react-cookies';

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
          <SidePanel  isOpen={this.state.isOpen}
                      toggleClose={this.isOpen} 
                      seafileAPI={seafileAPI}/>
          <MainPanel isOpen={this.isOpen} seafileAPI={seafileAPI} >
            <Notification  seafileAPI={seafileAPI} />
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

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './pages/dashboard/side-panel';
import MainPanel from './pages/dashboard/main-panel';
import Account from './components/account';
import Notification from './components/notification';

import cookie from 'react-cookies';
import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/dashboard.css';

import { siteRoot } from './components/constants';


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
          <SidePanel isOpen={this.state.isOpen} toggleClose={this.isOpen} />
          <MainPanel isOpen={this.isOpen}>
            <Notification  />
            <Account />
          </MainPanel>
      </div>
    )
  }
}

ReactDOM.render(
  <DashBoard />,
  document.getElementById('wrapper')
);

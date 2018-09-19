import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './pages/dashboard/side-panel';
import MainPanel from './pages/dashboard/main-panel';
import { siteRoot } from './components/constants';
import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css'
import './css/dashboard.css';
import './css/toolbar.css';
import './css/search.css';


class DashBoard extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
  }

  isOpen = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  }
	
  onSearchedClick = (item) => { 
    let str = item.path.substr(item.path.length-1, 1);
    if (str === '/'){
      window.location.href= siteRoot + '#common/lib/' + item.repo_id + item.path;
    } else {
      window.location.href= siteRoot + 'lib/' + item.repo_id + '/file' + item.path;
    }
  }

  render() {
    return (
      <div id="main">
        <SidePanel isOpen={this.state.isOpen} toggleClose={this.isOpen} />
        <MainPanel isOpen={this.isOpen}></MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <DashBoard />,
  document.getElementById('wrapper')
);

import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';

class Drafts extends Component {

  render() {
    return (
      <div id="main">
          <h1>欢迎来到草稿界面,加油吧,!!!</h1>
      </div>
    )
  }
}

ReactDOM.render(
  <Drafts />,
  document.getElementById('wrapper')
);

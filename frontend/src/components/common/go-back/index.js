import React, { Component } from 'react';

import './index.css';

class GoBack extends Component {

  onBackClick = (event) => {
    event.preventDefault();
    window.history.back();
  };

  render() {
    return (
      <div className="go-back" onClick={this.onBackClick}>
        <span className="sf3-font sf3-font-down rotate-90 d-inline-block"></span>
      </div>
    );
  }
}

export default GoBack;

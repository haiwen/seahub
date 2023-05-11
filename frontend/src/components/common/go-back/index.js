import React, { Component } from 'react';

import './index.css';

class GoBack extends Component {

  onBackClick = (event) => {
    event.preventDefault();
    window.history.back();
  }

  render() {
    return (
      <div className="go-back" onClick={this.onBackClick}>
        <span className="fas fa-chevron-left"></span>
      </div>
    );
  }
}

export default GoBack;

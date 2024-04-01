import React from 'react';

import './style.css';

class CodeMirrorLoading extends React.Component {
  render() {
    return (
      <div className="empty-loading-page">
        <div className="lds-ripple page-centered"><div></div><div></div></div>
      </div>
    );
  }
}

export default CodeMirrorLoading;

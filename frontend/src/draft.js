import React from 'react';
import ReactDom from 'react-dom';

import './css/draft.css';

export default function Draft() {
  return (
    <div style={{display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      <h1>Draft module</h1>
      <div>The current module is no longer supported</div>
    </div>
  );
}

ReactDom.render(<Draft />, document.getElementById('wrapper'));

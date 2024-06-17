import React from 'react';
import ReactDom from 'react-dom';

import './css/draft.css';

export default function Draft() {
  return (
    <div id="draft">
      <h1>Draft module</h1>
      <div>The current module is no longer supported</div>
    </div>
  );
}

ReactDom.render(<Draft />, document.getElementById('wrapper'));

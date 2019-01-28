import React from 'react';
import ReactDOM from 'react-dom';

class SharedFileViewText extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div> Shared view text </div>
    );
  }
}

ReactDOM.render (
  <SharedFileViewText />,
  document.getElementById('wrapper')
);

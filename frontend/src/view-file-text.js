import React from 'react';
import ReactDOM from 'react-dom';

class ViewFileText extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div> view text file </div>
    );
  }
}

ReactDOM.render (
  <ViewFileText />,
  document.getElementById('root')
);

import React from 'react';
import ReactDOM from 'react-dom';
import UMind from './umind';

class ViewFileUMind extends React.Component {

  render() {
    return (
      <UMind />
    );
  }
}

ReactDOM.render(
  <ViewFileUMind />,
  document.getElementById('wrapper')
);
import React from 'react';
import ReactDOM from 'react-dom';
import UMind from './umind/umind';

class ViewFileUmind extends React.Component {

  render() {
    return (
      <UMind />
    );
  }
}

ReactDOM.render(
  <ViewFileUmind />,
  document.getElementById('wrapper')
);
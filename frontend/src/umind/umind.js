import React from 'react';
import PropTypes from 'prop-types';
import GGEditor, { Mind } from 'gg-editor';

import '../css/umind.css';

const propTypes = {
  
};

class UMind extends React.Component {

  render() {
    return (
      <div className="umind-container">
        <div className="umind-header">工具栏</div>
        <div className="umind-main">
          <div className="umind-editor">
            <div>
            <Mind
              id={'001'}
              data={'123'}
            />
            </div>
            <div></div>
          </div>
          <div className="umind-detail">属性栏</div>
        </div>
      </div>
    );
  }
}

UMind.propTypes = propTypes;

export default UMind;

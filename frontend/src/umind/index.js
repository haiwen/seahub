import React from 'react';
import PropTypes from 'prop-types';
import GGEditor, { Mind } from 'gg-editor';
import data from './mock';
import UMindToolbar from './umind-toolbar';
import UMindDetailPanel from './umind-detail-panel';
import UMindEditorMinimap from './umind-editor/umind-editor-minimap';

import '../css/umind.css';

const propTypes = {
  
};

class UMind extends React.Component {

  render() {
    return (
      <GGEditor className="umind-container">
        <div className="umind-header">
          <UMindToolbar />
        </div>
        <div className="umind-main">
          <div className="umind-editor-container">
            <Mind data={data} className="umind-editor" />
          </div>
          <div className="umind-property-container">
            <UMindDetailPanel />
            <UMindEditorMinimap />
          </div>
        </div>
      </GGEditor>
    );
  }
}

UMind.propTypes = propTypes;

export default UMind;

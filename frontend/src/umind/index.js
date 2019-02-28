import React from 'react';
import PropTypes from 'prop-types';
import GGEditor, { Mind } from 'gg-editor';
import data from './mock';
import UMindToolbar from './umind-toolbar/umind-toolbar';
import UMindCustomToolbar from './umind-toolbar/custom-toolbar';
import UMindDetailPanel from './umind-detail-panel';
import UMindEditorMinimap from './umind-editor/umind-editor-minimap';

import '../css/umind.css';

const propTypes = {
  
};

class UMind extends React.Component {

  constructor(props) {
    super(props);
    this.state = {

    };
    this.ggEditor = React.createRef();
  }

  onSaveClick = () => {
    let currentPage = this.ggEditor.getCurrentPage();
    let { data } = currentPage.config;
    console.log(data);
  }

  render() {
    
    return (
      <GGEditor ref={ggEditor => { this.ggEditor = ggEditor; }} className="umind-container">
        <div className="umind-header">
          <UMindToolbar />
          <UMindCustomToolbar onSaveClick={this.onSaveClick} />
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

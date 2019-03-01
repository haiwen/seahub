import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'antd';
import GGEditor, { Mind } from 'gg-editor';
import UMindToolbar from './umind-toolbar/umind-toolbar';
import UMindCustomToolbar from './umind-toolbar/custom-toolbar';
import UMindDetailPanel from './umind-detail-panel';
import UMindEditorMinimap from './umind-editor/umind-editor-minimap';
import UMindContextMenu from './umind-editor/umind-context-menu';

import data from './mock';

import 'antd/dist/antd.css';
import './theme/iconfont.css'
import '../css/umind.css';

const propTypes = {
  
};

class UMind extends React.Component {

  render() {
    return (
      <GGEditor className="umind-container">
        <Row type="flex" className="umind-header">
          <Col span={20}>
            <UMindToolbar />
          </Col>
          <Col span={4}>
            <UMindCustomToolbar />
          </Col>
        </Row>
        <Row type="flex" className="umind-body">
          <Col span={20} className="umind-editor-content">
            <Mind data={data} className="umind-editor" />
          </Col>
          <Col span={4} className="umind-editor-sidebar">
            <UMindDetailPanel />
            <UMindEditorMinimap />
          </Col>
        </Row>
        <UMindContextMenu />
      </GGEditor>
    );
  }
}

UMind.propTypes = propTypes;

export default UMind;

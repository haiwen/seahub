import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'antd';
import GGEditor, { Mind } from 'gg-editor';
import { seafileAPI } from '../utils/seafile-api';
import UMindToolbar from './umind-toolbar/umind-toolbar';
import UMindCustomToolbar from './umind-toolbar/custom-toolbar';
import UMindDetailPanel from './umind-detail-panel';
import UMindEditorMinimap from './umind-editor/umind-editor-minimap';
import UMindContextMenu from './umind-editor/umind-context-menu';
import Loading from '../components/loading';

// import data from './mock.js';
import 'antd/dist/antd.css';
import './theme/iconfont.css'
import '../css/umind.css';

const propTypes = {
  
};

const { repoID, fileName, filePath } = window.app.pageOptions;

class UMind extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: ''
    };
    this.umindContent = '';
  }

  componentDidMount() {
    seafileAPI.getFileDownloadLink(repoID, filePath).then(res => {
      let url = res.data;
      seafileAPI.getFileContent(url).then(res => {
        let data = res.data;
        this.umindContent = data;
        this.setState({
          isLoading: false,
          data: data
        });
      });
    })
  }

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
            {this.state.isLoading && <Loading />}
            {!this.state.isLoading && (
              <Mind data={this.umindContent} className="umind-editor" />
            )}
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

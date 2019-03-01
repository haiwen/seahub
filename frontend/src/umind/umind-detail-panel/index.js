import React from 'react';
import { Card } from 'antd';
import { NodePanel, CanvasPanel, DetailPanel } from 'gg-editor';
import NodeDetail from './node-detail';

class UMindDetails extends React.Component {

  render() {
    return (
      <DetailPanel className="detail-panel">
        <NodePanel className="node-detail">
          <NodeDetail />
        </NodePanel>
        <CanvasPanel className="node-detail">
          <Card type="inner" title="画布属性" bordered={true} />
        </CanvasPanel>
      </DetailPanel>
    );
  }
}

export default UMindDetails;

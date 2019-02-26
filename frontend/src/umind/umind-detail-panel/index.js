import React from 'react';
import PropTypes from 'prop-types';
import { NodePanel, CanvasPanel, DetailPanel } from 'gg-editor';
import ItemDetail from './item-detail';

const propTypes = {

};

class UMindDetails extends React.Component {

  render() {
    return (
      <DetailPanel className="detail-panel">
        <NodePanel>
          <div>节点属性</div>
          <ItemDetail />
        </NodePanel>
        <CanvasPanel>
          <div>画布属性</div>
        </CanvasPanel>
      </DetailPanel>
    );
  }
}

UMindDetails.propTypes = propTypes;

export default UMindDetails;

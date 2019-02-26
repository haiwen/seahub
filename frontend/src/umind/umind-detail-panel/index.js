import React from 'react';
import PropTypes from 'prop-types';
import { NodePanel, CanvasPanel, DetailPanel } from 'gg-editor';

const propTypes = {

};

class UMindDetails extends React.Component {

  render() {
    return (
      <DetailPanel>
        <NodePanel>

        </NodePanel>
        <CanvasPanel>
        </CanvasPanel>
      </DetailPanel>
    );
  }
}

UMindDetails.propTypes = propTypes;

export default UMindDetails;

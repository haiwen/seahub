import React from 'react';
import { Card } from 'antd';
import { Minimap } from 'gg-editor';

class UMindEditorMinimap extends React.Component {
  render() {
    return (
      <Card type="inner" title="缩略图" bordered={false}>
        <Minimap height={200} />
      </Card>
    );
  }
}

export default UMindEditorMinimap;

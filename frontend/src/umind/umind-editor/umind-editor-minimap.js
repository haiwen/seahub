import React from 'react';
import { Minimap } from 'gg-editor';

class UMindEditorMinimap extends React.Component {
  render() {
    return (
      <div className="editor-minimap" title="缩略图">
        <Minimap height={200} />
      </div>
    );
  }
}

export default UMindEditorMinimap;

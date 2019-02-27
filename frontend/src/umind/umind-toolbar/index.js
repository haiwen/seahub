import React from 'react';
import PropTypes from 'prop-types';
import { Toolbar, Command } from 'gg-editor';

const propTypes = {

};

class UMindToolBar extends React.Component {

  render() {
    return (
      <Toolbar className="umind-common-toolbar">
        <Command name="undo">撤销</Command>
        <Command name="redo">恢复</Command>
        <Command name="zoomIn">缩小</Command>
        <Command name="zoomOut">放大</Command>
        <Command name="autoZoom">适应画布</Command>
        <Command name="resetZoom">实际尺寸</Command>
        <Command name="append">插入同级</Command>
        <Command name="appendChild">插入子级</Command>
        <Command name="collapse">折叠</Command>
        <Command name="expand">展开</Command>
      </Toolbar>
    );
  }
}

UMindToolBar.propTypes = propTypes;

export default UMindToolBar;

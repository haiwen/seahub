import React from 'react';
import { Command, NodeMenu, CanvasMenu, ContextMenu } from 'gg-editor';

import './context-menu.css';

class UMindContextMenu extends React.Component {
  render() {
    return (
      <ContextMenu className="context-menu">
        <NodeMenu>
          <Command name="append">
            <div className="item">
              <i className="bi-icon icon-insert-sibling" />
              <span>插入同级</span>
            </div>
          </Command>
          <Command name="appendChild">
            <div className="item">
              <i className="bi-icon icon-insert-child" />
              <span>插入子级</span>
            </div>
          </Command>
          <Command name="collapse">
            <div className="item">
              <i className="bi-icon icon-collapse-subtree" />
              <span>折叠</span>
            </div>
          </Command>
          <Command name="expand">
            <div className="item">
            <i className="bi-icon icon-expand-subtree" />
              <span>展开</span>
            </div>
          </Command>
          <Command name="delete">
            <div className="item">
              <i className="iconfont icon-delete-o" />
              <span>删除</span>
            </div>
          </Command>
        </NodeMenu>
        <CanvasMenu>
          <Command name="undo">
            <div className="item">
              <i className="iconfont icon-undo" />
              <span>撤销</span>
            </div>
          </Command>
          <Command name="redo">
            <div className="item">
              <i className="iconfont icon-redo" />
              <span>重做</span>
            </div>
          </Command>
        </CanvasMenu>
      </ContextMenu>
    );
  }
}

export default UMindContextMenu;

import React, { Component } from "react";
import TreeDirList from './tree-dir-list'
import "../../css/tree-dir-view.css";
const gettext = window.gettext;

class TreeDirView extends React.Component {
  render() {
    let node = this.props.node;
    let children = node.hasChildren() ? node.children : null;

    return (
      <table className="doc-view-container">
        <thead className="doc-view-header">
          <tr className="row">
            <th style={{width: "5%"}}></th>
            <th style={{width: "60%"}}>{gettext('Name')}</th>
            <th style={{width: "15%"}}>{gettext('Size')}</th>
            <th style={{width: "20%"}}>{gettext('Last Update')}</th>
          </tr>
        </thead>
        <tbody className="doc-view-body">
          {children && children.map((node, index) => {
            return (
              <TreeDirList key={index} node={node} onMainNodeClick={this.props.onMainNodeClick}></TreeDirList>
            )
          })}
        </tbody>
      </table>
    )
  }
}

export default TreeDirView;
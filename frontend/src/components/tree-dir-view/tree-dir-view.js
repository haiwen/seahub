import React, { Component } from "react";
import TreeDirList from './tree-dir-list'
import "../../css/common.css";
const gettext = window.gettext;

class TreeDirView extends React.Component {
  render() {
    let node = this.props.node;
    let children = node.hasChildren() ? node.children : null;

    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{width: "4%"}}></th>
              <th style={{width: "4%"}}></th>
              <th style={{width: "56%"}}>{gettext('Name')}</th>
              <th style={{width: "16%"}}>{gettext('Size')}</th>
              <th style={{width: "20%"}}>{gettext('Last Update')}</th>
            </tr>
          </thead>
          <tbody>
            {children && children.map((node, index) => {
              return (
                <TreeDirList key={index} node={node} onMainNodeClick={this.props.onMainNodeClick}></TreeDirList>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
}

export default TreeDirView;
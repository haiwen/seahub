import React, { Component } from "react";
import TreeDocList from './tree-doc-list'
import "../../css/tree-doc-view.css";
const gettext = window.gettext;

class TreeDocView extends React.Component {
  render() {
    let node = this.props.node;
    let children = node.hasChildren() ? node.children : null;

    return (
      <table className="doc-view-container">
        <thead className="doc-view-header">
          <tr className="row">
            <th className="dirent-icon"><span className="img-placeholder"></span></th>
            <th className="col-md-7">{gettext('Name')}</th>
            <th className="col-md-2">{gettext('Size')}</th>
            <th className="col-md-2">{gettext('Last Update')}</th>
          </tr>
        </thead>
        <tbody className="doc-view-body">
          {children && children.map((node, index) => {
            return (
              <TreeDocList key={index} node={node} onMainNodeClick={this.props.onMainNodeClick}></TreeDocList>
            )
          })}
        </tbody>
      </table>
    )
  }
}

export default TreeDocView;
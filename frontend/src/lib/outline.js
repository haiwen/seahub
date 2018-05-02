import React from 'react';

class OutlineItem extends React.Component {

  onClick = (event) => {
    this.props.editor.scrollToNode(this.props.node);
  }

  render() {
    const node = this.props.node;
    var c;
    if (node.type === "header_two") {
      c = "outline-h2";
    } else if (node.type === "header_three") {
      c = "outline-h3";
    }

    return (
      <div className={c} key={node.key}
        onClick={this.onClick}>{node.text}</div>
    )
  }
}

class OutlineView extends React.Component {


  render() {
    const { document } = this.props.value;
    var headerList = document.nodes.filter(node => {
      return (node.type === "header_two" || node.type === "header_three");
    })

    return (
      <div className="seafile-editor-outline">
        {headerList.map(node => {
          return (
            <OutlineItem
              key={node.key}
              editor={this.props.editor}
              value={this.props.value} node={node} />
          );
        })}
      </div>
    )
  }

}

export default OutlineView;

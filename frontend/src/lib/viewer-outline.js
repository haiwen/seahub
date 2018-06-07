import React from 'react';

class OutlineItem extends React.Component {

  onClick = (event) => {
    this.props.viewer.scrollToNode(this.props.node);
  }

  render() {
    const node = this.props.node;
    var c;
    if (node.depth === 2) {
      c = "seafile-md-viewer-outline-heading2";
    } else if (node.depth === 3) {
      c = "seafile-md-viewer-outline-heading3";
    }

    return (
      <div className={c}
        onClick={this.onClick}>{node.text}</div>
    )
  }
}

class OutlineView extends React.Component {


  render() {
    const root = this.props.treeRoot;
    var headingList = root.children.filter(node => {
      return (node.type === "heading" &&
        (node.depth === 2 || node.depth === 3));
    })

    for (let i = 0; i < headingList.length; i++) {
      for (let child of headingList[i].children) {
        if (child.type === "text") {
          headingList[i].text = child.value;
          break;
        }
      }
      headingList[i].key = i;
    }

    return (
      <div className="seafile-viewer-outline">
        {headingList.map(node => {
          return (
            <OutlineItem
              key={node.key}
              viewer={this.props.viewer}
              node={node} />
          );
        })}
      </div>
    )
  }

}

export default OutlineView;

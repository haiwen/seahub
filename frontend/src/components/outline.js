import React from 'react';
import { processor, processorGetAST } from '@seafile/seafile-editor/src/lib/seafile-markdown2html';

class OutlineItem extends React.Component {
  constructor(props) {
    super(props);
    this.handleSelectedEvent.bind(this);
  }

  handleSelectedEvent(event) {
    var target = event.target || event.srcElement;
    while (target.tagName !== "LI") {
      target = target.parentNode;
    }
    var parentNode = target.parentNode;
    var navList = parentNode.childNodes;
    navList.forEach(function (navItem) {
      navItem.classList.remove('wiki-outline-item-active');
    });
    target.classList.add('wiki-outline-item-active');
  }

  render() {
    var id_prefix = "user-content-";
    var node = this.props.node;
    var id = node.data.id;
    var text = node.text;
    var clazz = node.clazz;

    return (
      <li className={"wiki-outline-item " + clazz} data-index={node.key}>
        <a href={"#" + id_prefix + id} title={text}>{text = text.length < 12 ? text : text.substring(0, 12) + "......"}</a>
      </li>
    )
  }

}


class OutlineComponent extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      html: '',
      nodeTree: null
    };
  }

  setContent(markdownContent) {
    var _this = this;
      processor.process(markdownContent, function (err, file) {
        _this.setState({
          html: String(file),
          nodeTree: null
        });
      });
  }

  componentDidMount() {
    var markdownContent = this.props.markdownContent;
    this.setContent(markdownContent);
  }

  componentWillReceiveProps(nextProps) {
    var that = this;
    var markdownContent = nextProps.markdownContent;
    this.setContent(markdownContent);
    processorGetAST.run(processorGetAST.parse(markdownContent)).then((nodeTree) => {
      that.setState({
        nodeTree: nodeTree
      });
    });
  }

  formatNodeTree(nodeTree) {
    var headingList = nodeTree.children.filter(function (node) {
      return node.type === "heading" && (node.depth === 2 || node.depth === 3);
    });

    for (let i = 0; i < headingList.length; i++) {
      for (let child of headingList[i].children) {
        if (child.type === "text") {
          headingList[i].text = child.value;
          break;
        }
      }
      
      headingList[i].clazz = '';
      if (headingList[i].depth === 3) {
        headingList[i].clazz = "textindent-2";
      }
      
      headingList[i].key = i;
    }
    
    return headingList;
  }

  render() {
    var nodeTree = this.state.nodeTree;
    if(!nodeTree || !nodeTree.children.length){
      return (
        <div className="wiki-viewer-outline"></div>
      )
    }
    var headingList = this.formatNodeTree(nodeTree);

    return (
      <ul className="wiki-viewer-outline">
        { headingList.map(node => {
          return (
            <OutlineItem key={node.key} node={node}/>
          )
        })}
      </ul>
    )
  }
}

export default OutlineComponent;

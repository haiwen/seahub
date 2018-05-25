var unified = require('unified');
var stringify = require('remark-stringify');
var definitions = require('mdast-util-definitions');

var processor = unified().use(stringify, {
  rule: '-',
  ruleSpaces: false,
  listItemIndent: 1,
  bullet: "*",
  commonmark: true,
  fences: true
});


function _applyMark(node, markString) {
  var type;
  switch (markString) {
    case "BOLD":
      return {
        type: "strong",
        children: [
          node
        ]
      }
    case "ITALIC":
      return {
        type: "emphasis",
        children: [
          node
        ]
      }
      break;
    case "CODE":
      return {
        type: "inlineCode",
        value: node.value
      }
    default:
      console.log("unknown mark string: " + markString);
      return node;
  }
}

/*
 object: text
   leaves:
     - text: 'Hello '
       marks: []
     - text: World
       marks:
         - type: BOLD

  --->
  Hello **World**
*/
function _text2MdNodes(node) {
  var mdNodes = []
  for (let leaf of node.leaves) {
    var mdNode = {
      type: "text",
      value: leaf.text
    }
    for (let mark of leaf.marks) {
      mdNode = _applyMark(mdNode, mark.type);
    }
    mdNodes.push(mdNode);
  }
  return mdNodes;
}

function addChildNodeOrNodes(children, childNodeOrNodes) {
  if (childNodeOrNodes instanceof Array) {
    childNodeOrNodes.map(item => children.push(item));
  } else {
    if (childNodeOrNodes !== undefined)
      children.push(childNodeOrNodes);
  }
}

function parseChildren(node) {
  var children = [];
  for (let child of node.nodes) {
    let ret = _slateNodeToMD(child);
    addChildNodeOrNodes(children, ret);
  }
  return children;
}


function _slateNodeToMD(node) {
  if (node.object == "block") {
    var mdNodes;

    switch (node.type) {
      case "paragraph":
        mdNodes = parseChildren(node);
        return {
          type: "paragraph",
          children: mdNodes
        }
      case "header_one":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 1,
          children: mdNodes
        }
      case "header_two":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 2,
          children: mdNodes
        }
      case "header_three":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 3,
          children: mdNodes
        }
      case "header_four":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 4,
          children: mdNodes
        }
      case "header_five":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 5,
          children: mdNodes
        }
      case "header_six":
        mdNodes = parseChildren(node);
        return {
          type: "heading",
          depth: 6,
          children: mdNodes
        }
      case "hr":
        return {
          type: "thematicBreak"
        }
      case "ordered_list":
        mdNodes = parseChildren(node);
        var loose = false;
        for (let node of mdNodes) {
          if (node.loose == true) {
            loose = true;
            break;
          }
        }
        return {
          type: "list",
          ordered: true,
          start: 1,
          loose: loose,
          children: mdNodes
        }
      case "unordered_list":
        mdNodes = parseChildren(node);
        var loose = false;
        for (let node of mdNodes) {
          if (node.loose === true) {
            loose = true;
            break;
          }
        }
        return {
          type: "list",
          ordered: false,
          start: 1,
          loose: loose,
          children: mdNodes
        }
      case "list_item":
        mdNodes = parseChildren(node);
        var loose = false;
        if (mdNodes) {
          if (mdNodes.length == 1) {
            loose = false;
          } else if (mdNodes.length == 2 && mdNodes[1].type == "list") {
            loose = false;
          } else {
            loose = true;
          }
        }
        return {
          type: "listItem",
          loose: loose,
          checked: node.data.checked !== undefined ? node.data.checked : null,
          children: mdNodes
        }
      case "code_block":
        mdNodes = parseChildren(node);

        return {
          type: "code",
          lang: node.data.syntax ? node.data.syntax : null,
          value: mdNodes.join('')
        }
      case 'code_line':
        return  node.nodes[0].leaves[0].text + '\n';
      case "table":
        mdNodes = parseChildren(node);
        return {
          type: "table",
          align: node.data.align ? node.data.align : null,
          children: mdNodes
        }
      case "table_row":
        mdNodes = parseChildren(node);
        return {
          type: 'tableRow',
          children: mdNodes
        }
      case "table_cell":
        mdNodes = parseChildren(node);
        return {
          type: 'tableCell',
          children: mdNodes
        };
      case "blockquote":
        mdNodes = parseChildren(node);
        return {
          type: 'blockquote',
          children: mdNodes
        };
      case "html_block":
        return {
          type: 'html',
          value: node.data.html
        };
    }
  } else if (node.object == "text") {
    return _text2MdNodes(node);
  } else if (node.object == "inline") {
    var mdNodes;

    switch (node.type) {
      case "image":
        return {
          type: "image",
          alt: node.data.alt ? node.data.alt : null,
          url: node.data.src,
          title: node.data.title ? node.data.title : null,
        };
      case "link":
        mdNodes = parseChildren(node);
        return {
          type: "link",
          url: node.data.href,
          title: node.data.title ? node.data.title : null,
          children: mdNodes
        };
      case "html_block":
        return {
          type: 'html',
          value: node.data.html
        };
    }
  }
}

function serialize(value) {
  const { document } = value;
  var children = [];

  for (let child of document.nodes) {
    addChildNodeOrNodes(children, _slateNodeToMD(child));
  }

  var root = {
    type: "root",
    children: children
  }
  var content = processor.stringify(root);
  return content;
}


export { serialize };

import { Value, Node, Document, Leaf, Block, Inline, Text, Mark } from 'slate';

var unified = require('unified');
var markdown = require('remark-parse');
var definitions = require('mdast-util-definitions');

var processor = unified().use(markdown, {
  commonmark: true,
});

// transform code value: a function used to tranform code value of markdown format to slate document
function mdCodeNodeToSlate (codeValue) {
  // statement an array : filled width code value splited by '\n'
  let codeValueArr = codeValue.split('\n');
  let slateTextObj, slateBlockObj;
  // map codeValueArr item to slate document 'code_line'
  let slate_code_arr = codeValueArr.map(function (text) {
    // transform string to slateText object
    slateTextObj = Text.create({
      text:text
    });
    // transform slateText to Block object
    slateBlockObj = Block.create({
      nodes:[slateTextObj],
      type:'code_line'
    });
    return slateBlockObj
  });

  return slate_code_arr
}

// deserialize mdTable to SlateNode
function mdTableToSlateTable(tableNode, opts) {
  // get align array
  let tableAlignArr = tableNode.align;
  // get all table_rows, return：array
  let tableRows = tableNode.children;
  // slate table_row Node into it
  let tableRowsArr = [];
  // traverse table_rows
  for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex ++ ) {
    // slate table_cell Node into it
    let tableCellsArr = [];
    /*
    * traverse every table_cells of an table_rows,
    * the length of every table_rows is equal to tableAlign array
    * */
    for (let columnsIndex = 0; columnsIndex < tableAlignArr.length; columnsIndex++) {
      // get table_cell and tranlate it to slate Node: table_cell
      let tableCell = tableRows[rowIndex].children[columnsIndex];
      let children = parseChildren(tableCell, opts);
      tableCell = Block.create({
        type: 'table_cell',
        nodes: children,
        data: {
          align: tableAlignArr[columnsIndex]
        }
      });
      tableCellsArr.push(tableCell);
    }
    // push add table_rows into tableRowsArr
    tableRowsArr.push( Block.create({
      type: 'table_row',
      nodes: tableCellsArr
    }));
  }

  return tableRowsArr
}



function _applyMark(childNodeOrNodes, mark) {
  if (childNodeOrNodes instanceof Array) {
    return childNodeOrNodes.map(item => _applyMark(item, mark));
  } else if (childNodeOrNodes.object == "text") {
    let length = childNodeOrNodes.text.length;
    return childNodeOrNodes.addMark(0, length, mark);
  } else {
    return childNodeOrNodes;
  }
}

function addChildNodeOrNodes(children, childNodeOrNodes) {
  if (childNodeOrNodes instanceof Array) {
    childNodeOrNodes.map(item => children.push(item));
  } else {
    if (childNodeOrNodes !== undefined)
      children.push(childNodeOrNodes);
  }
}

/*
 parse a mark node.
 Always return an array.

 Example
     *fdsfd __fdsf__ fdf*
*/
function parseMark(node, markString, opts) {
  var mark = Mark.create({
    type: markString,
  });
  var children = [];
  for (let child of node.children) {
    let childNodeOrNodes = _nodeToSlate(child, opts);
    childNodeOrNodes = _applyMark(childNodeOrNodes, mark);
    addChildNodeOrNodes(children, childNodeOrNodes);
  }
  return children;
}

function parseChildren(node, opts) {
  var children = [];
  for (let child of node.children) {
    let ret = _nodeToSlate(child, opts);
    addChildNodeOrNodes(children, ret);
  }
  return children;
}

function _nodeToSlate(node, opts) {
  var slateNode;
  var children = [];
  var mark;
  var { definition } = opts;
  switch (node.type) {
    case "heading":
      var header_string;
      children = parseChildren(node, opts);
      switch (node.depth) {
        case 1:
          header_string = "header_one";
          break;
        case 2:
          header_string = "header_two";
          break;
        case 3:
          header_string = "header_three";
          break;
        case 4:
          header_string = "header_four";
          break;
        case 5:
          header_string = "header_five";
          break;
        case 6:
          header_string = "header_six";
          break;
        default:
          console.log("Invalid depth: " + node.depth);
          header_string = "header_one";
          break;
      }
      return Block.create({
        type: header_string,
        nodes: children
      });
    case "paragraph":
      children = parseChildren(node, opts);
      return Block.create({
        type: 'paragraph',
        nodes: children
      });
    case "blockquote":
      children = parseChildren(node, opts);
      return Block.create({
        type: 'blockquote',
        nodes: children
      });
    case "list":
      opts.loose = node.loose;
      children = parseChildren(node, opts);
      if (node.ordered) {
        return Block.create({
          type: 'ordered_list',
          nodes: children
        });
      } else {
        return Block.create({
          type: 'unordered_list',
          nodes: children
        });
      }
    case "listItem":
      children = parseChildren(node, opts);
      var data = {}
      if (node.checked !== null) {
        data.checked = node.checked;
      }
      return Block.create({
        type: 'list_item',
        data: data,
        nodes: children
      });
    case "code":
      var data = {};
      if (node.lang) {
        data.syntax = node.lang;
      }
      let slate_code_arr = mdCodeNodeToSlate(node.value);
      return Block.create({
        type: 'code_block',
        data: data,
        nodes: slate_code_arr
      });
    case "strong":
      return parseMark(node, "BOLD", opts);
    case "emphasis":
      return parseMark(node, "ITALIC", opts);
    case "inlineCode":
      // Inline code need to be handled differently
      var mark = Mark.create({
        type: "CODE",
      });
      return Text.create({
        text: node.value,
        marks: [mark]
      });
      return slateNode;
    case "text":
      // A plain text in markdown
      // text is the botton node in Markdown AST
      return Text.create({
        text: node.value,
      });
    case "break":
      return Text.create({
        text: "\n",
      });
    case "thematicBreak":
      return Block.create({
        type: 'hr',
        isVoid: true,
      });
    case "table":
      // get all children of table by mdTableToSlateTable
      children = mdTableToSlateTable(node, opts);
      return Block.create({
        type: 'table',
        nodes: children,
        data: {
          align: node.align
        }
      });
    case "html":
      var child = Text.create({
        text: ""
      });
      children.push(child);
      return Inline.create({
        type: 'html_block',
        isVoid: true,
        data: {
          html: node.value
        },
        nodes: children
      });
    case "link":
      children = parseChildren(node, opts);
      var data = {
        href: node.url
      }
      if (node.title) {
        data.title = node.title;
      }
      return Inline.create({
        type: 'link',
        data: data,
        nodes: children
      });
    case "image":
      var data = {
        src: node.url
      }
      if (node.title) {
        data.title = node.title;
      }
      if (node.alt) {
        data.alt = node.alt;
      }
      return Inline.create({
        type: 'image',
        isVoid: true,
        data: data
      });
    case "linkReference":
      children = parseChildren(node, opts);
      var def = definition(node.identifier);
      var data = {}
      if (def) {
        data.href = def.url;
        if (def.title) {
          data.title = def.title;
        }
        return Inline.create({
          type: 'link',
          data: data,
          nodes: children
        });
      } else {
        return Text.create({
          text: "[" + node.identifier + "]"
        });
      }
    case "imageReference":
      var def = definition(node.identifier);
      var data = {}
      if (def) {
        data.src = def.url;
        if (def.title) {
          data.title = def.title;
        }
        if (node.alt) {
          data.alt = node.alt;
        }
        return Inline.create({
          type: 'image',
          data: data,
          isVoid: true
        });
      } else {
        return Text.create({
          text: "![" + node.alt + "]"
        });
      }
    case "definition":
      return;
    default:
      console.log("unrecognized type: " + node.type);
      return;
  }
}

function deserialize(content) {
  var root = processor.parse(content);
  var definition = definitions(root);

  var nodes = [];
  for (let child of root.children) {
    addChildNodeOrNodes(nodes, _nodeToSlate(child, { definition: definition }));
  }
  if (nodes.length == 0) {
    // add default paragraph
    var child = Text.create({
      text: "",
    });
    var node = Block.create({
      type: 'paragraph',
      nodes: [child]
    })
    nodes.push(node);
  }

  // handle top level html_block
  var c = [];
  for (let node of nodes) {
    if (node.type == "html_block") {
      // convert from inline to block
      node = Block.create({
        type: 'html_block',
        isVoid: true,
        data: {
          html: node.get('data').get('html')
        },
        nodes: node.nodes
      });
      c.push(node);
    } else {
      c.push(node);
    }
  }
  var document = Document.create({
    nodes: c
  });
  var value = Value.create({
    document: document
  });
  return value;
}


export { deserialize };

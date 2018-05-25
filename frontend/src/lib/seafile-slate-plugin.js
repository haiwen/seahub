import { Editor, getEventTransfer, getEventRange } from 'slate-react';
import isUrl from 'is-url';
import isHotkey from 'is-hotkey';
import { Inline, Text, Mark, Range } from 'slate';

function trailingSpace(
  change,
  currentTextNode,
  offsetIndex
) {
  change.insertTextByKey(currentTextNode.key, offsetIndex, " ");
}

/*
  remove all marks of current selection.
  If the selection is collapsed, it removes all marks of
  the character at the cursor
*/
function removeAllMark(change) {
  const { value } = change;
  if (value.marks) {
    // remove all marks
    value.marks.forEach(mark => {
      change.removeMark(mark);
    });
  }

  return change;
};

function matchCode(
  currentTextNode,
  matched,
  change
) {
  const matchedLength = matched[0].length;
  const addText = matched[0].trim().replace(new RegExp("`", "g"), "");

  change
    .deleteAtRange(
      Range.create({
        anchorKey: currentTextNode.key,
        focusKey: currentTextNode.key,
        anchorOffset: matched.index,
        focusOffset: matched.index + matchedLength
      })
    )
    .insertTextByKey(currentTextNode.key, matched.index, addText, [
      Mark.create({ type: "CODE" })
    ])
    .call(trailingSpace, currentTextNode, matched.index)
    .call(removeAllMark);
    // add space because the space the user inputed will not be inserted into
    // Editor as we handled the space
    // `removeAllMark` is needed to remove the CODE mark of the newly inserted
    // space
}

function matchItalic(
  currentTextNode,
  matched,
  change
) {
  const matchedLength = matched[0].length;
  const reg = matched[1] === "*" ? /\*/ : matched[1];
  const addText = matched[0].replace(new RegExp(reg, "g"), "");

  return change
    .deleteAtRange(
      Range.create({
        anchorKey: currentTextNode.key,
        focusKey: currentTextNode.key,
        anchorOffset: matched.index,
        focusOffset: matched.index + matchedLength
      })
    )
    .insertTextByKey(currentTextNode.key, matched.index, addText, [
      Mark.create({ type: "ITALIC" })
    ])
    .call(trailingSpace, currentTextNode, matched.index)
    .call(removeAllMark);
}

function matchBold(
  currentTextNode,
  matched,
  change
) {
  const matchedLength = matched[0].length;
  const reg = matched[1] === "**" ? /\*\*/ : matched[1];
  const addText = matched[0].replace(new RegExp(reg, "g"), "");
  return change
    .deleteAtRange(
      Range.create({
        anchorKey: currentTextNode.key,
        focusKey: currentTextNode.key,
        anchorOffset: matched.index,
        focusOffset: matched.index + matchedLength
      })
    )
    .insertTextByKey(currentTextNode.key, matched.index, addText, [
      Mark.create({ type: "BOLD" })
    ])
    .call(trailingSpace, currentTextNode, matched.index)
    .call(removeAllMark);
}

function matchBoldItalic(
  currentTextNode,
  matched,
  change
) {
  const matchedLength = matched[0].length;
  const reg = matched[1] === "***" ? /\*\*\*/ : matched[1];
  const addText = matched[0].trim().replace(new RegExp(reg, "g"), "");

  return change
    .deleteAtRange(
      Range.create({
        anchorKey: currentTextNode.key,
        focusKey: currentTextNode.key,
        anchorOffset: matched.index,
        focusOffset: matched.index + matchedLength
      })
    )
    .insertTextByKey(currentTextNode.key, matched.index, addText, [
      Mark.create({ type: "BOLD" }),
      Mark.create({ type: "ITALIC" })
    ])
    .call(trailingSpace, currentTextNode, matched.index)
    .call(removeAllMark);
}


function SeafileSlatePlugin(options) {
  let {
    editCode,
    editTable
  } = options;

  return {

    // use this function when insert table, insert column or delete column
    resetTableAlign(change, type) {
      let pos = editTable.utils.getPosition(change.value);
      if (type === 'insertNewTable') {
        /*
          init table align, when insert a new table
        * */

        // initial new insert table align
        change.setNodeByKey(pos.table.key, {
          data: {
            align: ['left', 'left']
          }
        });

        // initial table cell align
        change = this.setColumnAlign(change, 'left', '0');
        change = this.setColumnAlign(change, 'left', '1');
      } else if (type === 'removeColumn') {
        /*
        *  in when remove column
        * */
        // get current tableAlign return array
        let tableAlignArr = pos.table.get('data').get('align');
        // get current columnIndex
        let columnIndex = pos.getColumnIndex();
        // delete align data from tableAlign
        tableAlignArr.splice(columnIndex, 1);
        // reset table align
        change.setNodeByKey(pos.table.key, {
          data: {
            align: tableAlignArr
          }
        });
      } else if (type === 'insertColumn') {
        /*
        * in when insert column
        * */
        // get the new inserted columnIndex
        let columnIndex = pos.getColumnIndex();
        // get tableAlign array
        let tableAlignArr = pos.table.get('data').get('align');
        // insert align data to table align array
        tableAlignArr.splice(columnIndex, 0, 'left');

        // get new inserted column cell return an Array
        let columnCells = editTable.utils.getCellsAtColumn(
          pos.table,
          columnIndex
        );

        // set table cell align
        columnCells.forEach(cell => {
          change.setNodeByKey(cell.key, {data: {align: 'left'}});
        });

        // reset table align
        change.setNodeByKey(pos.table.key, {
          data: {align: tableAlignArr}
        });
      }
      return change
    },

    /*
    * use the function when setAlign,
    * columnNumber is string type because it will return false when columnNumber = 0
    * */
    setColumnAlign(change, align, columnNumber) {
      // get current position
      let pos = editTable.utils.getPosition(change.value);
      // get current table
      const table = pos.table;
      // get tableAlign array
      let tableAlignArr = table.get('data').get('align');
      // current column cells it is an array
      let columnCells;
      /*
      * the index of column that be going to set,
      * default it is current column index when columnNumber return false
      * */
      let columnIndex;
      if (columnNumber) {
        // set columnIndex to columnNumber
        columnIndex = Number(columnNumber);
      } else {
        // set columnIndex to current selected columnIndex
        columnIndex = pos.getColumnIndex();
      }
      // get selected cells by columnIndex
      columnCells = editTable.utils.getCellsAtColumn(
        pos.table,
        columnIndex
      );

      // set cells align
      columnCells.forEach(cell => {
        change.setNodeByKey(cell.key, {
          data: {align: align}
        });
      });

      // reset tableAlignArr by column index
      tableAlignArr[columnIndex] = align;
      // reset table
      change.setNodeByKey(pos.table.key, {
        data: {align: tableAlignArr}
      });

      return change
    },
    /*
    Ctrl+V to give the selected text a link which from the clipboard
    */

    onPaste(event, change) {
      event.preventDefault();
      const transfer = getEventTransfer(event);
      const { type, text } = transfer;
      if (type !== 'text' && type !== 'html') return;
      if (!isUrl(text)) return;

      if (change.value.isCollapsed) {

        const inlineText = Inline.create({
          data: { href: text },
          type: 'link',
          nodes: [Text.create({text:text})]
        });
        change.insertInline(inlineText);
        change.collapseToEnd();
        return true
      }

      const value = change.value;

      if (value.inlines.some(inline => inline.type === 'link')) {
        change.call((change) => {
          change.unwrapInline('link');
        });
      }

      change.call((change, href) => {
        change.wrapInline({
          type: 'link',
          data: { href }
        });
        change.collapseToEnd();
      }, text);
      return true
    },



    /**
    * Get the block type for a series of auto-markdown shortcut `chars`.
    *
    * @param {String} chars
    * @return {String} block
    */
    getType(chars) {
      switch (chars) {
        case '*':
        case '-':
        case '+':
        case '1.':
        return 'list_item'
        case '>':
        return 'block-quote'
        case '#':
        return 'header_one'
        case '##':
        return 'header_two'
        case '###':
        return 'header_three'
        case '####':
        return 'header_four'
        case '#####':
        return 'header_five'
        case '######':
        return 'header_six'
        default:
        return null
      }
    },

    /**
    *
    * @param {Event} event
    * @param {Change} change
    */

    onEnter(event, change) {
      const { value } = change
      if (value.isExpanded) return

      const { startBlock, startOffset, endOffset } = value
      /*
      if (startOffset === 0 && startBlock.text.length === 0)
        return this.onBackspace(event, change)
      */
      //console.log(startBlock)
      if (endOffset !== startBlock.text.length) return

      /* enter code block if put ``` */
      if (startBlock.text === '```') {
        event.preventDefault()
        editCode.changes.wrapCodeBlockByKey(change, startBlock.key)
        // move the cursor to the start of new code block
        change.collapseToStartOf(change.value.document.getDescendant(startBlock.key))
        // remove string '```'
        change.deleteForward(3)
        return true
      }

      /* enter hr block if put *** or --- */
      if (startBlock.text === '***' || startBlock.text === '---') {
        event.preventDefault()
        change.removeNodeByKey(startBlock.key).insertBlock({
          type: 'hr',
          isVoid: true
        }).collapseToStartOfNextBlock()
        return true
      }

      /*
       * On return, if at the end of a node type that should not be extended,
       * create a new paragraph below it.
      */
      // create a paragraph node after 'enter' after a header line
      if (
        startBlock.type !== 'header_one' &&
        startBlock.type !== 'header_two' &&
        startBlock.type !== 'header_three' &&
        startBlock.type !== 'header_four' &&
        startBlock.type !== 'header_five' &&
        startBlock.type !== 'header_six' &&
        startBlock.type !== 'block-quote'
      ) {
        return;
      }

      event.preventDefault()
      change.splitBlock().setBlocks('paragraph')
      return true
    },

    handleInlineMarks(event, change) {
      // console.log("handleInlineMarks");
      const { value } = change;
      const { texts } = value;

      const currentTextNode = texts.get(0);
      const currentLineText = currentTextNode.text;
      let matched;
      const offsetBeforeSpace = value.selection.anchorOffset - 1;
      const lastChar = currentLineText.charAt(offsetBeforeSpace);
      const prevTextFromSpace = currentLineText.substr(0, offsetBeforeSpace + 1);

      /*
      console.log(lastChar);
      console.log(prevTextFromSpace);
      */
      // inline patterns
      // match `code`,
      // Reference https://github.com/PrismJS/prism/blob/gh-pages/components/prism-markdown.js
      if (
        (matched =
          lastChar === "`" && prevTextFromSpace.match(/`[^`\n]+`$/m))
      ) {
        //console.log(matched);
        matchCode(currentTextNode, matched, change);
        return true;
      }

      // match *string*, _italic_.
      if (lastChar === "*" || lastChar === "_") {
        if ((matched = prevTextFromSpace.match(/\s?(\*\*\*|___)((?!\1).)+?\1$/m))) {
          // [Bold + Italic] ***[strong + italic]***, ___[strong + italic]___
          return matchBoldItalic(currentTextNode, matched, change);
        } else if (
          (matched = prevTextFromSpace.match(/\s?(\*\*|__)((?!\1).)+?\1$/m))
        ) {
          // [Bold] **strong**, __strong__
          return matchBold(currentTextNode, matched, change);
        } else if (
          (matched = prevTextFromSpace.match(/\s?(\*|_)((?!\1).)+?\1$/m))
        ) {
          // [Italic] _em_, *em*
          return matchItalic(
            currentTextNode,
            matched,
            change
          );
        }
      }

    },

    /**
    * On space, if it was after an auto-markdown shortcut, convert the current
    * node into the shortcut's corresponding type.
    *
    * @param {Event} event
    * @param {Change} change
    */
    onSpace(event, change) {
      if (this.editor.isInCode())
        return;

      const { value } = change
      if (value.isExpanded) return

      const { startBlock, startOffset } = value
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '')
      const type = this.getType(chars)

      if (!type)
        return this.handleInlineMarks(event, change);
      if (type === 'list_item' && startBlock.type === 'list_item')
        return this.handleInlineMarks(event, change);

      // handle block shortcut
      event.preventDefault()
      change.setBlocks(type)

      if (type === 'list_item') {
        if (chars === "1.") {
          change.wrapBlock('ordered_list')
        } else {
          change.wrapBlock('unordered_list')
        }
      }

      change.extendToStartOf(startBlock).delete()
      return true
    },

    /**
    * On backspace, if at the start of a non-paragraph, convert it back into a
    * paragraph node.
    *
    * @param {Event} event
    * @param {Change} change
    */
    onBackspace(event, change) {
      const { value } = change
      if (value.isExpanded) return
      // If the cursor not at the start of node, do nothing
      if (value.startOffset !== 0) return

      const { startBlock } = value
      // If the cursor at the start of a paragraph, do nothing
      if (startBlock.type == 'paragraph') return
      if (startBlock.type == 'code_line') return

      event.preventDefault()
      change.setBlocks('paragraph')

      const { document } = value
      if (startBlock.type === 'list-item') {
        const pNode = document.getParent(startBlock.key)
        // unwrap the parent 'numbered-list' or 'bulleted-list'
        change.unwrapBlock(pNode.type)
      }

      return true
    },


    onKeyDown(event, change, editor) {
      switch (event.key) {
        case 'Enter':
          return this.onEnter(event, change);
        case ' ':
          return this.onSpace(event, change);
        case 'Backspace':
          return this.onBackspace(event, change);
      }
      if (isHotkey('mod+s', event)) {
          event.preventDefault();
          this.editor.onSave(event);
          return true;
      } else if (isHotkey('mod+b', event)) {
          event.preventDefault();
          change.addMark('BOLD');
          return true;
      } else if (isHotkey('mod+i', event)) {
          event.preventDefault();
          change.addMark('ITALIC');
          return true;
      }
    },

    onDrop(event, change, editor) {
      const transfer = getEventTransfer(event);
      const range = getEventRange(event, change.value);
      switch (transfer.type) {
        case 'text': {
          const { text } = transfer;
          if (!isUrl(text))
            return;
          if (text.endsWith("png?raw=1") || text.endsWith("png?raw=1")
            || text.endsWith("jpg?raw=1") || text.endsWith("JPG?raw=1") ) {
            // a special URL from seafile server
            var node = Inline.create({
              type: 'image',
              isVoid: true,
              data: {
                src: text
              }
            });
            change.insertInline(node);
            return true;
          }

          if (editor.props.editorUtilities.isInternalFileLink(text)) {
            let index = text.lastIndexOf("/");
            if (index == -1) {
              return;
            }
            var fileName = text.substring(index + 1);
            var t = Text.create({
              text: fileName
            });
            var node = Inline.create({
              type: 'link',
              data: {
                href: text
              },
              nodes: [t]
            });
            change.insertInline(node);
            return true;
          }

        }
      }
    }

  }
}

export default SeafileSlatePlugin;

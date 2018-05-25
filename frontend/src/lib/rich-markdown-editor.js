import React from 'react';
import { Editor } from 'slate-react';
import EditCode from 'slate-edit-code'
import EditTable from 'slate-edit-table'
import EditList from 'slate-edit-list'
import TrailingBlock from 'slate-trailing-block'
import EditBlockquote from 'slate-edit-blockquote'
import InsertImages from 'slate-drop-or-paste-images'
import SidePanel from './side-panel';
import { Image } from './image';
import CheckListItem from './check-list-item';
import { Inline, Text } from 'slate';
import AddImageDialog from './add-image-dialog';
import AddLinkDialog from './add-link-dialog';
import SeafileSlatePlugin from './seafile-slate-plugin';
import Alert from 'react-s-alert';
import '../css/richeditor/right-panel.css';
import '../css/richeditor/side-panel.css';
import 'react-s-alert/dist/s-alert-default.css';
import 'react-s-alert/dist/s-alert-css-effects/scale.css';
import { IconButton, TableToolBar, Button, ButtonGroup, MoreMenu } from "./topbarcomponent/editorToolBar";

import { translate } from "react-i18next";

const DEFAULT_NODE = 'paragraph';
const editCode = EditCode();

const editTable = EditTable();

const editBlockquote = EditBlockquote();
const editList = EditList({
  types: ["ordered_list", "unordered_list"]
});
const trailingBlock = TrailingBlock({ type: 'paragraph' })

/*
  When an image is pasted or dropped, insertImage() will be called.
  insertImage creates an image node with `file` stored in `data`.
*/
const insertImages = InsertImages({
  extensions: ['png'],
  insertImage: (change, file, editor) => {
    var node = Inline.create({
      type: 'image',
      isVoid: true,
      data: {
        file: file
      }
    })
    // schedule image uploading
    editor.props.editorUtilities.uploadImage(file).then((imageURL) => {
      // change the node property after image uploaded
      const change2 = editor.props.value.change();
      change2.setNodeByKey(node.key, {
        data: {
          src: imageURL
        }
      });
      editor.props.onChange(change2);
    })
    return change.insertInline(node);
  }
});

var seafileSlatePlugin = new SeafileSlatePlugin({
  editCode,
  editTable
});

const plugins = [
  editTable,
  editList,
  editCode,
  insertImages,
  editBlockquote,
  trailingBlock,
  seafileSlatePlugin
]


class RichMarkdownEditor extends React.Component {

  state = {
    showAddImageDialog: false,
    isSelectedImage:false,
    leftNavMode: "files",
    showAddLinkDialog: false,
    rightWidth: 75,
    resizeFlag: false
  };

  constructor(props) {
    super(props);
    seafileSlatePlugin.editor = this;
  }

  setContent() {
    this.setState({
      isSelectedImage: false,
    })
  }

  componentDidMount() {
    this.setContent();
  }

  componentWillReceiveProps() {
    this.setContent();
  }

  scrollToNode = (node) => {
    // TODO: scroll to the corresponding position, make the focus on
    // the center of the screen
    const change = this.props.value.change().collapseToStartOf(node).focus();
    this.onChange(change);
  }

  /**
  * Check if the current selection has a mark with `type` in it.
  *
  * @param {String} type
  * @return {Boolean}
  */
  hasMark = type => {
    const value = this.props.value
    return value.activeMarks.some(mark => mark.type === type)
  }

  /*
     check if selected are 'link'
  */
  hasLinks = value => {
    return value.inlines.some(inline => inline.type === 'link')
  }

  isInTable() {
    return editTable.utils.isSelectionInTable(this.props.value);
  }

  isInCode() {
    return editCode.utils.isInCodeBlock(this.props.value);
  }

  /*
    check if wrap link
  */
  onToggleLink = event => {
    event.preventDefault();
    const value  = this.props.value;
    const hasLinks = this.hasLinks(value);
    const change = value.change();
    if (hasLinks) {
      change.call((change) => {
        change.unwrapInline('link');
      });
      this.onChange(change);
    } else {
      this.toggleLinkDialog();
    }
  }

  /*
    set link href
  */
  onSetLink = url => {
    const value = this.props.value;
    const change = value.change();
    if (value.isExpanded) {
      change.call((change, href) => {
        change.wrapInline({
          type: 'link',
          data: { href }
        });
        change.collapseToEnd();
      }, url);
    } else {
      const inlineText = Inline.create({
        data: { href: url },
        type: 'link',
        nodes: [Text.create({text:url})]
      });
      change.insertInline(inlineText);
      change.collapseToEnd();
    }
    this.onChange(change);
  }

  toggleLinkDialog = () => {
    this.setState({
      showAddLinkDialog: !this.state.showAddLinkDialog
    });
  }

  /**
   * Check if the any of the currently selected blocks are of `type`.
   *
   * @param {String} type
   * @return {Boolean}
   */

  hasBlock = type => {
    const value = this.props.value
    return value.blocks.some( node => node.type === type)
  }

  onChange = (change) => {
    this.props.onChange(change);
  }

  /**
  * When a mark button is clicked, toggle the current mark.
  *
  * @param {Event} event
  * @param {String} type
  */

  onClickMark = (event, type) => {
    event.preventDefault()
    const value = this.props.value;
    const change = value.change().toggleMark(type)
    this.onChange(change)
  }

  /**
   * When a block button is clicked, toggle the block type.
   *
   * @param {Event} event
   * @param {String} type
   */
  onClickBlock = (event, type) => {
    event.preventDefault()
    const value = this.props.value;
    const change = value.change()
    const { document } = value
    // Handle everything but list buttons.
    if (type === 'block-quote') {
      const isInBlockquote = editBlockquote.utils.isSelectionInBlockquote(value);
      if (isInBlockquote) {
        editBlockquote.changes.unwrapBlockquote(change);
      } else {
        editBlockquote.changes.wrapInBlockquote(change);
      }
    } else if (type === 'ordered_list' || type === 'unordered_list') {
      const block = editList.utils.getCurrentList(value);
      const isType = block && block.type == type;
      if (isType) {
        editList.changes.unwrapList(change);
      } else {
        editList.changes.wrapInList(editList.changes.unwrapList(change), type);
      }

    } else {
      const isActive = this.hasBlock(type);
      change.setBlocks(isActive ? DEFAULT_NODE : type)
    }
    this.onChange(change);
  }

  onAddCheckItem = (event) => {
    event.preventDefault()
    const value = this.props.value;
    const change = value.change();

    var item = editList.utils.getCurrentItem(value);
    if (item === null) {
      // not in list, add list
      editList.changes.wrapInList(change, "unordered_list");
      item = editList.utils.getCurrentItem(change.value);
      change.setNodeByKey(item.key, { data: { checked: false } });
      this.onChange(change);
    } else {
      // in a list
      if (item.get('data').get('checked') === undefined) {
        change.setNodeByKey(item.key, { data: { checked: false } });
      } else {
        change.setNodeByKey(item.key, { data: { } });
      }
      this.onChange(change);
    }
  }

  /**
   * Toggle inline code or code block
   *
   * @param {Event} event
   */
  onToggleCode = (event) => {
    event.preventDefault()
    const value = this.props.value
    const { selection } = value
    const change = value.change()
    this.onChange(editCode.changes.toggleCodeBlock(change))
  }

  /**
   * Add table
   *
   * @param {Event} event
   */
  onAddTable(event) {
    event.preventDefault()
    const value = this.props.value
    const change = value.change()
    if (editTable.utils.isSelectionInTable(value)) {
      editTable.changes.removeTable(change);
      this.onChange(change)
    } else {
      // insert table to document, return change
      let returnedChange = editTable.changes.insertTable(change, 2, 2);
      if (change.value.startKey) {
        // reset table align, and return change
        returnedChange = seafileSlatePlugin.resetTableAlign(returnedChange, 'insertNewTable');
      }

      this.onChange(returnedChange);
    }
  }

  onInsertImage = (url) => {
    const change = this.props.value.change().insertInline({
      type: 'image',
      isVoid: true,
      data: { src: url },
    });
    this.onChange(change);
  }

  toggleImageDialog = () => {
    this.setState({
      showAddImageDialog: !this.state.showAddImageDialog
    });
  }

  /**
   * Add image
   *
   * @param {Event} event
   */
  onAddImage = (event) => {
    event.preventDefault();

    this.toggleImageDialog();

  }
         
  /**
   * Render a Slate node.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderNode = props => {
    /*
       props contains  { attributes, children, node, isSelected, editor, parent, key }
    */
    const { attributes, children, node, isSelected } = props;

    switch (node.type) {
      case 'paragraph':
        return <p {...attributes}>{children}</p>
      case 'blockquote':
        return <blockquote {...attributes}>{children}</blockquote>
      case 'header_one':
        return <h1 {...attributes}>{children}</h1>
      case 'header_two':
        return <h2 {...attributes}>{children}</h2>
      case 'header_three':
        return <h3 {...attributes}>{children}</h3>
      case 'header_four':
        return <h4 {...attributes}>{children}</h4>
      case 'header_five':
        return <h5 {...attributes}>{children}</h5>
      case 'header_six':
        return <h6 {...attributes}>{children}</h6>
      case 'list_item':
        var checked = node.get('data').get('checked');
        if (checked === undefined)
          return <li {...attributes}>{children}</li>
        return (
          <CheckListItem {...props} />
        )
      case 'unordered_list':
        return <ul {...attributes}>{children}</ul>
      case 'ordered_list':
        return <ol {...attributes}>{children}</ol>
      case 'image':
        return <Image {...props}/>
      case 'code_block':
        return (
          <pre className="code" {...attributes}>
          {children}
          </pre>
        );
      case 'code_line':
        return <p>{children}</p>;
      case 'table':
        return (
          <table>
            <tbody {...attributes}>{children}</tbody>
          </table>
        );
      case 'table_row':
        return <tr {...attributes}>{children}</tr>;
      case 'table_cell':
        let align = node.get('data').get('align');
        align = ['left', 'right', 'center'].indexOf(align) === -1
            ? 'left' : align;

        return (
          <td style={{ textAlign: align }} {...attributes}>
          {children}
          </td>
        );
      case 'link':
        var href = node.get('data').get('href');
        return (
          <a href={ href }>{children}</a>
        );
      case 'hr':
        var className = isSelected ? 'active' : null
        return (
          <hr {...attributes} className={className} />
        );
      case 'html_block':
        var html = node.get('data').get('html');
        var className = isSelected ? 'html-element active' : "html-element";
        if (node.object == "block") {
          return (
            <div className={className} {...attributes}>{html}</div>
          )
        } else {
          return (
            <span className={className} {...attributes}>{html}</span>
          )
        }
    }
  }

  renderMark = props => {
    const { children, mark, node } = props
    switch (mark.type) {
      case 'BOLD':
      return <strong>{children}</strong>
      case 'CODE':
      return <code>{children}</code>
      case 'ITALIC':
      return <em>{children}</em>
    }
  }

  hasSelectImage (value) {
    /*
    * get image obj when selected,has not found a better way
    * */
    let imageObj = value.inlines.toJSON()[0];
    if (imageObj && imageObj.type === 'image') {
      return true
    }
    return false
  }

  /**** resize ****/
  onResizeMouseUp = (event) => {
    this.setState({
      resizeFlag: false
    });
  }

  onResizeMouseDown = (event) => {
    this.setState({
      resizeFlag: true
    })
  };

  onResizeMouseMove = (event) => {
    const rightWidth = this.state.rightWidth - (event.nativeEvent.movementX / event.view.innerWidth)*100;
    if (rightWidth >= 90 || rightWidth <= 5) {
      this.setState({
        resizeFlag: false
      });
      return
    }
    this.setState({
      rightWidth: rightWidth,
    });
  };

  onSave = (event) => {
    this.props.onSave()
  };

  render() {
    const value = this.props.value;
    const onResizeMove = this.state.resizeFlag ? this.onResizeMouseMove : null;
    return (
      <div className='seafile-editor'>
        <div className="seafile-editor-topbar">
          <div className="title"><img src={ require('../assets/seafile-logo.png') } alt=""/></div>
            {this.renderToolbar()}
        </div>
        <div className="seafile-editor-main d-flex" onMouseMove={onResizeMove} onMouseUp={this.onResizeMouseUp}>
            <div className="seafile-editor-left-panel align-self-start" style={{width:(100-this.state.rightWidth)+'%'}}>
              <SidePanel
                editor={this}
                value={this.props.value}
                editorUtilities={this.props.editorUtilities}
              />
            </div>
            <div className="seafile-editor-right-panel align-self-end" style={{width:this.state.rightWidth+'%'}}>
              <div className="seafile-editor-resize" onMouseDown={this.onResizeMouseDown}></div>
              <div className="editor-container">
              <div className="editor article">
                <Editor
                    value={this.props.value}
                    autoFocus={true}
                    plugins={plugins}
                    onChange={this.onChange}
                    onKeyDown={this.onKeyDown}
                    renderNode={this.renderNode}
                    renderMark={this.renderMark}
                    onDrop={this.onDrop}
                    editorUtilities={this.props.editorUtilities}
                />
              </div>
              </div>
          </div>
        </div>
      </div>
    )
  }

  renderToolbar = () => {
    const { t } = this.props
    const value = this.props.value;
    var isTableActive = false;
    var isCodeActive = false;
    try {
      isTableActive = editTable.utils.isSelectionInTable(value);
      isCodeActive = editCode.utils.isInCodeBlock(value);
    } catch (err) {
      console.log(err);
    }
    const isImageActive = this.hasSelectImage(value);
    const isLinkActive = this.hasLinks(value);

    let showMarkButton = true, showBlockButton = true, showCodeButton = true,
      showImageButton = true, showAddTableButton = true, showLinkButton = true;
    let isSaveActive = this.props.contentChanged;

    if (isCodeActive) {
      showMarkButton = false;
      showBlockButton = false;
      showCodeButton = true;
      showImageButton = false;
      showAddTableButton = false;
      showLinkButton = false;
    }
    if (isTableActive) {
      showMarkButton = true;
      showCodeButton = false;
      showImageButton = true;
      showBlockButton = false ;
      showAddTableButton = false;
      showLinkButton = true;
    }
    return (
      <div className="menu toolbar-menu">
        {
          showMarkButton === true &&
          <ButtonGroup>
            {this.renderMarkButton("BOLD", "fa fa-bold")}
            {this.renderMarkButton('ITALIC', 'fa fa-italic')}
          </ButtonGroup>
        }
        { showBlockButton === true &&
          <ButtonGroup>
            {this.renderBlockButton('header_one', 'fa fa-h1')}
            {this.renderBlockButton('header_two', 'fa fa-h2')}
            {this.renderBlockButton('header_three', 'fa fa-h3')}
          </ButtonGroup>
        }
        { showBlockButton === true &&
          <ButtonGroup>
            {this.renderBlockButton('block-quote', 'fa fa-quote-left')}
            {this.renderBlockButton('ordered_list', 'fa fa-list-ol')}
            {this.renderBlockButton('unordered_list', 'fa fa-list-ul')}
            <IconButton text={t('check_list_item')} id={'checkListItemButton'} icon={"fa fa-check-square"} onMouseDown={this.onAddCheckItem} />
          </ButtonGroup>
        }

        <ButtonGroup>
          {
            showLinkButton === true &&
            <IconButton text={t('insert_link')} id={'linkButton'} icon={'fa fa-link'} isActive={isLinkActive} onMouseDown={this.onToggleLink}/>
          }
          { showCodeButton === true &&
            <IconButton text={t('code')} id={'codeButton'} icon={"fa fa-code"} onMouseDown={this.onToggleCode} isActive={isCodeActive}/>
          }
          { showAddTableButton === true && this.renderAddTableButton()}
          { showImageButton === true &&
            <IconButton text={t('insert_image')} id={'imageButton'} icon={"fa fa-image"} onMouseDown={this.onAddImage} isActive={isImageActive}/>
          }
        </ButtonGroup>
        { isTableActive === true && this.renderTableToolbar()}
        { this.props.saving ? (
          <ButtonGroup>
            <button type={"button"} className={"btn btn-icon btn-secondary btn-active btn-loading"} >
              <i className={"fa fa-save"}/>
            </button>
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <IconButton text={t('save')} id={'saveButton'} icon={"fa fa-save"} onMouseDown={this.onSave} disabled={!isSaveActive} isActive={isSaveActive}/>
          </ButtonGroup>
        )}
        <MoreMenu id={'moreButton'} text={t('more')}  switchToPlainTextEditor={this.props.switchToPlainTextEditor} t={ t }/>
        <AddImageDialog
          showAddImageDialog={this.state.showAddImageDialog}
          toggleImageDialog={this.toggleImageDialog}
          onInsertImage={this.onInsertImage}
          t = { t }
        />
        <AddLinkDialog
          showAddLinkDialog={this.state.showAddLinkDialog}
          toggleLinkDialog={this.toggleLinkDialog}
          onSetLink={this.onSetLink}
          t = { t }
        />
        <Alert stack={{limit: 3}} />
      </div>
    )
  }

  renderAddTableButton = () => {
    const { t } = this.props
    const onAddTable = event => this.onAddTable(event);
    return(
      <IconButton text={t('insert_table')} id={'tableButton'} icon={'fa fa-table'} onMouseDown={onAddTable}/>
    )
  };

  renderTableToolbar = () => {
    const { t } = this.props
    return (
      <TableToolBar
        onRemoveTable={this.onRemoveTable}
        onInsertColumn={this.onInsertColumn}
        onRemoveColumn={this.onRemoveColumn}
        onInsertRow={this.onInsertRow}
        onRemoveRow={this.onRemoveRow}
        onSetAlign={this.onSetAlign}
        t={ t }
      />
    )
  }

  onInsertColumn = event => {
    event.preventDefault();
    let change = editTable.changes.insertColumn(this.props.value.change());
    change = seafileSlatePlugin.resetTableAlign(change, 'insertColumn');
    this.onChange(change);
  };

  onInsertRow = event => {
    event.preventDefault();
    this.onChange(editTable.changes.insertRow(this.props.value.change()));
  };

  onRemoveColumn = event => {
    event.preventDefault();
    let change = this.props.value.change();
    change = seafileSlatePlugin.resetTableAlign(change, 'removeColumn');
    change = editTable.changes.removeColumn(change);
    this.onChange(change);
  };

  onRemoveRow = event => {
    event.preventDefault();
    this.onChange( editTable.changes.removeRow(this.props.value.change()));
  };

  onRemoveTable = event => {
    event.preventDefault();
    this.onChange( editTable.changes.removeTable(this.props.value.change()));
  };

  onSetAlign = (event, align) => {
    event.preventDefault();
    let change = seafileSlatePlugin.setColumnAlign(this.props.value.change(),align);
    this.onChange(change);
  };

  renderMarkButton = (type, icon) => {
    const { t } = this.props
    let isActive = this.hasMark(type), toolTipText = '';
    const onMouseDown = event => this.onClickMark(event, type);
    if (type ==='BOLD') {
      toolTipText = 'bold'
    } else {
      toolTipText = 'italic'
    }
    return (
      // eslint-disable-next-line react/jsx-no-bind
      <IconButton text={t(toolTipText)} id={type + 'Button'} onMouseDown={onMouseDown} isActive={isActive} icon={icon}></IconButton>
    )
  }

  /**
  * Render a block-toggling toolbar button.
  *
  * @param {String} type
  * @param {String} icon
  * @return {Element}
  */
  renderBlockButton = (type, icon) => {
    const { t } = this.props
    let isActive = false, toolTipText = '';
    if (type === 'ordered_list' || type === 'unordered_list')  {
      const listBlock = editList.utils.getCurrentList(this.props.value);
      isActive = listBlock && listBlock.type === type;
      if (type === 'ordered_list') {
        toolTipText = 'ordered_list'
      } else {
        toolTipText = 'unordered_list'
      }
    } else if (type === 'block-quote') {
      isActive = editBlockquote.utils.isSelectionInBlockquote(this.props.value);
      toolTipText = 'quote'
    } else {
      if (this.props.value.isFocused) {
        isActive = this.hasBlock(type);
      }
      if (type === 'header_two') {
        toolTipText = 'H2'
      } else if (type === 'header_one'){
        toolTipText = 'H1'
      } else if (type === 'header_three') {
        toolTipText = 'H3'
      }
    }
    const onMouseDown = event => this.onClickBlock(event, type);
    return (
      // eslint-disable-next-line react/jsx-no-bind
      <IconButton text={t(toolTipText)} id={type + "Button"} onMouseDown={onMouseDown} isActive={isActive} icon={icon}/>
    )
  }

}

export default translate("translations")(RichMarkdownEditor);

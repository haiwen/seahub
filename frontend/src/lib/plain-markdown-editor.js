import React from 'react';
import { IconButton, Button, ButtonGroup } from "./topbarcomponent/editorToolBar";
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap'
import { processor } from "./seafile-markdown2html"
import Alert from 'react-s-alert';
import isHotkey from 'is-hotkey';
import { translate } from "react-i18next";
const ReactDOM = require('react-dom');
const className = require('classnames');
const lodash = require('lodash');
require('codemirror/lib/codemirror.css');
require('codemirror/mode/markdown/markdown');
require('../css/plaineditor/markdown-editor.css');


function normalizeLineEndings (str) {
  if (!str) return str;
  return str.replace(/\r\n|\r/g, '\n');
}

class CodeMirror extends React.Component {

  state = {
    isFocused: false
  }

  getCodeMirrorInstance () {
    return this.props.codeMirrorInstance || require('codemirror');
  }

  componentWillMount () {
    if (this.props.path) {
      console.error('Warning: react-codemirror: the `path` prop has been changed to `name`');
    }
  }

  componentDidMount () {
    const codeMirrorInstance = this.getCodeMirrorInstance();
    this.codeMirror = codeMirrorInstance.fromTextArea(this.textareaNode, this.props.options);
    this.codeMirror.on('change', this.codemirrorValueChanged);
    this.codeMirror.on('cursorActivity', this.cursorActivity);
    this.codeMirror.on('focus', this.focusChanged.bind(this, true));
    this.codeMirror.on('blur', this.focusChanged.bind(this, false));
    this.codeMirror.on('scroll', this.scrollChanged);
    this.codeMirror.setValue(this.props.defaultValue || this.props.initialValue || '');
  }

  componentWillUnmount () {
    // is there a lighter-weight way to remove the cm instance?
    if (this.codeMirror) {
      this.codeMirror.toTextArea();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.codeMirror && nextProps.initialValue !== undefined && nextProps.initialValue !== this.props.initialValue) {
      if (this.props.preserveScrollPosition) {
        var prevScrollPosition = this.codeMirror.getScrollInfo();
        this.codeMirror.setValue(nextProps.initialValue);
        this.codeMirror.scrollTo(prevScrollPosition.left, prevScrollPosition.top);
      } else {
        this.codeMirror.setValue(nextProps.initialValue);
      }
    }
    if (typeof nextProps.options === 'object') {
      for (let optionName in nextProps.options) {
        if (nextProps.options.hasOwnProperty(optionName)) {
          this.setOptionIfChanged(optionName, nextProps.options[optionName]);
        }
      }
    }
  }

  setOptionIfChanged (optionName, newValue) {
    const oldValue = this.codeMirror.getOption(optionName);
    if (!lodash.isEqual(oldValue, newValue)) {
      this.codeMirror.setOption(optionName, newValue);
    }
  }

  getCodeMirror () {
    return this.codeMirror;
  }

  focus = () => {
    if (this.codeMirror) {
      this.codeMirror.focus();
    }
  }

  focusChanged = (focused) => {
    this.setState({
      isFocused: focused,
    });
    this.props.onFocusChange && this.props.onFocusChange(focused);
  }

  cursorActivity = (cm) => {
    this.props.onCursorActivity && this.props.onCursorActivity(cm);
  }

  scrollChanged = (cm) => {
    this.props.onScroll && this.props.onScroll(cm.getScrollInfo());
  }

  codemirrorValueChanged = (doc, change) => {
    if (this.props.onChange && change.origin !== 'setValue') {
      this.props.onChange(doc.getValue(), change);
    }
  }

  render () {
    const editorClassName = className(
      'ReactCodeMirror',
      this.state.isFocused ? 'ReactCodeMirror--focused' : null,
      this.props.className
    );
    return (
      <div className={editorClassName}>
        <textarea
          ref={ref => this.textareaNode = ref}
          name={this.props.name || this.props.path}
          defaultValue={this.props.value}
          autoComplete="off"
          autoFocus={this.props.autoFocus}
        />
      </div>
    );
  }

}


class MoreMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      dropdownOpen:false
    }
  }

  toggle = () => {
    this.setState({
      dropdownOpen:!this.state.dropdownOpen
    });
  }

  render() {
    const { t } = this.props
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
        <DropdownToggle>
          <i className="fa fa-ellipsis-v"></i>
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          <DropdownItem onMouseDown={this.props.switchToRichTextEditor}>{t("switch_to_rich_text_editor")}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    )
  }
}


/*

When loading a new file:

             markdownContent                    initialValue
  index.js  -----------------> MarkdownEditor --------> CodeMirror --> Real CodeMirror

When user type in CodeMirror

                    value             value
   Real CodeMirror ------> CodeMirror ------> MarkdownEditor (valueOfCodeMirror)

On Save:

                 value
  MarkdownEditor -----> index.js

*/

class PlainMarkdownEditor extends React.Component {

  state = {
    html: "",
    leftIsBindScroll: false,
    rightIsBindScroll: false
  };

  /*
  *   the data about scroll, these variable has nothing to width react
  *   they are not state
  * */
  scrollData = {
    scrollPercentage: 0,
    leftPanel: null,
    rightPanel: null,
  }

  setContent(markdownContent) {
    processor.process(markdownContent).then(
      (vfile) => {
        var html = String(vfile);
        this.setState({
          html: html
        });
      }
    );
  }

  componentDidMount() {
    // get relevant dom when component mounted instead of get them when scrolling to improve performance
    this.scrollData.leftPanel = document.querySelector('.plain-editor-left-panel');
    this.scrollData.rightPanel = document.querySelector('.plain-editor-right-panel');
    this.setContent(this.props.currentContent);
  }

  componentWillReceiveProps(nextProps) {
    this.setContent(nextProps.currentContent);
  }

  updateCode = (newCode) => {
    this.props.onChange(newCode);
  }

  renderToolbar() {
    const { t } = this.props
    let isSaveActive = this.props.contentChanged;
    return (
      <div className="menu toolbar-menu">
        { this.props.saving ? (
          <ButtonGroup>
            <button type={"button"} className={"btn btn-icon btn-secondary btn-active btn-loading"} >
              <i className={"fa fa-save"}/>
            </button>
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <IconButton id={'saveButton'} text={t('save')} icon={"fa fa-save"} onMouseDown={this.props.onSave} disabled={!isSaveActive} isActive={isSaveActive} />
          </ButtonGroup>
        )}
        <MoreMenu switchToRichTextEditor={this.props.switchToRichTextEditor} t={ t }/>
        <Alert stack={{limit: 3}} />
      </div>
    );
  }

  onLeftScroll = (e) => {
    let srcElement = this.scrollData.leftPanel;
    this.scrollData.scrollPercentage = srcElement.scrollTop / srcElement.scrollHeight;
    this.scrollData.rightPanel.scrollTop = this.scrollData.scrollPercentage * this.scrollData.rightPanel.scrollHeight;
  };

  onRightScroll = (e) => {
    let srcElement = this.scrollData.rightPanel;
    this.scrollData.scrollPercentage = srcElement.scrollTop / srcElement.scrollHeight;
    this.scrollData.leftPanel.scrollTop = this.scrollData.scrollPercentage * this.scrollData.leftPanel.scrollHeight;
  };

  onEnterLeftPanel = () => {
    this.setState({
      leftIsBindScroll: true
    });
  };

  onLeaveLeftPanel = () => {
    this.setState({
      leftIsBindScroll: false,
    });
  };

  onEnterRightPanel = () => {
    this.setState({
      rightIsBindScroll: true
    });
  };

  onLeaveRightPanel = () => {
    this.setState({
      rightIsBindScroll: false
    })
  }

  onHotKey = (event) => {
    if (isHotkey('mod+s', event)) {
        event.preventDefault();
        this.props.onSave(event);
        return true;
    }
  }

  render() {
    var options = {
			lineNumbers: true,
      mode: "markdown",
      lineWrapping: true,
		};

    return (
      <div className='seafile-editor'>
        <div className="seafile-editor-topbar">
          <div className="title"><img src={ require('../assets/seafile-logo.png') } alt=""/></div>
          {this.renderToolbar()}
        </div>
        <div className="seafile-editor-main d-flex">
          <div className="plain-editor-left-panel" onKeyDown={this.onHotKey} onMouseLeave={this.onLeaveLeftPanel} onMouseEnter={this.onEnterLeftPanel}  onScroll={this.state.leftIsBindScroll ? this.onLeftScroll : null}>
            <CodeMirror initialValue={this.props.initialValue}
              onChange={this.updateCode} options={options} />
          </div>
          <div className="plain-editor-right-panel" onMouseEnter={this.onEnterRightPanel} onMouseLeave={this.onLeaveRightPanel} onScroll={this.state.rightIsBindScroll ? this.onRightScroll :null}>
            <div className="preview">
              <div className="rendered-markdown article" dangerouslySetInnerHTML={{ __html: this.state.html }}>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

}

export default translate("translations")(PlainMarkdownEditor);

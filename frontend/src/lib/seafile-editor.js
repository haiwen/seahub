import React from 'react';
import Alert from 'react-s-alert';
import { translate } from "react-i18next";
import '../css/initial-style.css';
import '../css/layout.css';
import '../css/topbar.css';

import RichMarkdownEditor from './rich-markdown-editor';
import PlainMarkdownEditor from './plain-markdown-editor';

import { serialize, deserialize } from '../slate2markdown';
const lodash = require('lodash');

class SeafileEditor extends React.Component {

  state = {
    isTreeDataLoaded: false,
    editor: "rich",
    initialPlainValue: "", // for plain editor
    richValue: deserialize(""),
    currentContent: "",
    savedContent: "",
    contentChanged: false,
    saving: false
  }

  constructor(props) {
    super(props);
    this.checkNeedSave = lodash.throttle(this.onCheckNeedSave, 1000);
    this.convertAndCheckNeedSave = lodash.throttle(
      this.convertAndCheckNeedSave, 1000);
  }

  setContent(markdownContent) {
    const value = deserialize(markdownContent);
    this.setState({
      currentContent: markdownContent,
      initialPlainValue: markdownContent,
      richValue: value,
      contentChanged: false,
      savedContent: markdownContent,
    })
  }

  componentDidMount() {
    this.setContent(this.props.markdownContent);
    window.addEventListener("beforeunload", this.onUnload);
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onUnload);
  }

  componentWillReceiveProps(nextProps) {
    this.setContent(nextProps.markdownContent);
  }

  onUnload = event => {
    if (!this.state.contentChanged) return
    const confirmationMessage = 'Leave this page? The system may not save your changes.';
    event.returnValue = confirmationMessage;
    return confirmationMessage;
  }

  switchToPlainTextEditor = () => {
    this.setState({
      editor: "plain",
      initialPlainValue: this.state.currentContent
    });
  }

  switchToRichTextEditor = () => {
    this.setState({
      editor: "rich",
      richValue: deserialize(this.state.currentContent)
    });
  }

  convertAndCheckNeedSave = (newValue) => {
    let currentContent = serialize(newValue.toJSON()).trim();
    let contentChanged = currentContent != this.state.savedContent.trim();
    this.setState({
      currentContent: currentContent,
      contentChanged: contentChanged
    })
  }

  onCheckNeedSave = (newContent) => {
    this.setState({
      contentChanged: newContent != this.state.savedContent
    })
  }

  onChange = (change) => {
    if (this.state.editor === 'rich') {
      this.setState({
        richValue: change.value,
      })
      const ops = change.operations
        .filter(o => o.type != 'set_selection' && o.type != 'set_value')
      if (ops.size != 0) {
        // we need to parse change.value to convertAndCheckNeedSave()
        // because after setState, this.state will only be updated
        // at the end of current event loop which may be later
        // than convertAndCheckNeedSave() be called
        this.convertAndCheckNeedSave(change.value);
      }
    } else {
      this.setState({
        currentContent: change,
      })
      // save as above
      this.checkNeedSave(change);
    }
  }

  saveContent = (str) => {
    var promise = this.props.editorUtilities.saveContent(str).then(() => {
      this.setState({
        saving: false,
        savedContent: this.state.currentContent,
        contentChanged: false
      });
      Alert.success(this.props.t('file_saved'), {
            position: 'bottom-right',
            effect: 'scale',
            timeout: 1000
      });
    }, () => {
      this.setState({
        saving: false
      });
      Alert.error(this.props.t('file_failed_to_save'), {
            position: 'bottom-right',
            effect: 'scale',
            timeout: 1000
      });
    });
    this.setState({
      saving: true
    })
  }

  onRichEditorSave = () => {
    const value = this.state.richValue;
    const str = serialize(value.toJSON());
    this.saveContent(str)
  }

  onPlainEditorSave = () => {
    const str = this.state.currentContent;
    this.saveContent(str)
  }

  render() {
    if (this.state.editor === "rich") {
      return (
        <RichMarkdownEditor
          editorUtilities={this.props.editorUtilities}
          switchToPlainTextEditor={this.switchToPlainTextEditor}
          onChange={this.onChange}
          onSave={this.onRichEditorSave}
          value={this.state.richValue}
          contentChanged={this.state.contentChanged}
          saving={this.state.saving}
        />
      );
    } else if (this.state.editor === "plain") {
      return (
        <PlainMarkdownEditor
          editorUtilities={this.props.editorUtilities}
          initialValue={this.state.initialPlainValue}
          currentContent={this.state.currentContent}
          contentChanged={this.state.contentChanged}
          saving={this.state.saving}
          switchToRichTextEditor={this.switchToRichTextEditor}
          onSave={this.onPlainEditorSave}
          onChange={this.onChange}
        />
      );
    }
  }
}

export default translate("translations")(SeafileEditor);

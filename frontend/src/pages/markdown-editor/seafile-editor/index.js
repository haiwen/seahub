import React from 'react';
import PropTypes from 'prop-types';
import { Text } from 'slate';
import { deserialize, serialize, PlainMarkdownEditor } from '@seafile/seafile-editor';
import toaster from '../../../components/toast';
import { gettext } from '../../../utils/constants';
import RichMarkdownEditor from '../rich-markdown-editor';

const propTypes = {
  mode: PropTypes.string,
  editorMode: PropTypes.string,
  readOnly: PropTypes.bool,
  isDraft: PropTypes.bool,
  scriptSource: PropTypes.string,
  markdownContent: PropTypes.string,
  editorApi: PropTypes.object.isRequired,
  collaUsers: PropTypes.array,
  onContentChanged: PropTypes.func.isRequired,
  onSaving: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  fileTagList: PropTypes.array,
  onFileTagChanged: PropTypes.func.isRequired,
  participants: PropTypes.array.isRequired,
  onParticipantsChange: PropTypes.func.isRequired,
  markdownLint: PropTypes.bool,
  setFileInfoMtime: PropTypes.func.isRequired,
  setEditorMode: PropTypes.func,
  autoSaveDraft: PropTypes.func,
  setDraftValue: PropTypes.func,
  clearTimer: PropTypes.func,
  deleteDraft: PropTypes.func,
  contentChanged: PropTypes.bool,
  openDialogs: PropTypes.func,
};

class SeafileEditor extends React.Component {

  constructor(props) {
    super(props);
    const { mode, markdownContent, isDraft } = this.props;
    const isEditMode = mode === 'editor' || isDraft;
    const richValue = isEditMode ? deserialize(markdownContent) : deserialize('');
    this.state = {
      initialPlainValue: '',
      currentContent: markdownContent,
      richValue: richValue,
      issues: { issue_list: []}
    };
    this.lastModifyTime = null;
    this.autoSave = false;
    this.isParticipant = false;
    window.seafileEditor = this;
  }

  componentWillMount() {
    if (this.props.editorMode === 'rich') {
      const document = this.state.richValue;
      const firstNode = document[0];
      /**
       *  if the markdown content is empty, the rich value contains
       *  only a paragraph which contains a empty text node 
       * 
      */
      if (document.length === 1 &&
         firstNode.type === 'paragraph' &&
         firstNode.children.length === 1 && 
         Text.isText(firstNode.children[0]) &&
         firstNode.children[0].text.length === 0) {
        let headerContent = this.props.fileInfo.name.slice(0, this.props.fileInfo.name.lastIndexOf('.'));
        const header = {
          type: 'header_one',
          children: [{text: headerContent, marks: []}]
        };
        document.push(header);
        document.shift();
        
        this.setState({richValue: document});
      }
    }
  }

  componentDidMount() {
    window.addEventListener('beforeunload', this.onUnload);

    // notify current user if others are also editing this file
    const { collabUsers } = this.props;
    const editingUsers = collabUsers.filter(ele => ele.is_editing === true && ele.myself === undefined);
    if (editingUsers.length > 0) {
      const message = gettext('Another user is editing this file!');
      toaster.danger(message, {duration: 3});
    }

  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload);
  }

  onUnload = (event) => {
    if (!this.props.contentChanged) return;
    const confirmationMessage = gettext('Leave this page? The system may not save your changes.');
    this.props.clearTimer();
    this.props.deleteDraft && this.props.deleteDraft();
    event.returnValue = confirmationMessage;
    return confirmationMessage;
  };

  switchToPlainTextEditor = () => {
    // TODO: performance, change to do serialize in async way
    if (this.props.editorMode === 'rich') {
      const value = this.state.richValue;
      const str = serialize(value);
      this.props.setEditorMode('plain');
      this.setState({
        initialPlainValue: str,
        currentContent: str
      });
    }
    if (this.props.collabServer) {
      this.props.emitSwitchEditor(false);
    }
  };

  switchToRichTextEditor = () => {
    // TODO: performance, change to do deserialize in async way
    this.setState({richValue: deserialize(this.state.currentContent)});
    this.props.setEditorMode('rich');

    if (this.props.collabServer) {
      this.props.emitSwitchEditor(false);
    }
  };

  saveContent = (str) => {
    this.props.onSaving(true);
    this.props.editorApi.saveContent(str).then(() => {
      this.props.onSaving(false);
      this.props.onContentChanged(false);
      // remove markdown lint temporarily
      // if (this.props.markdownLint) {
      //   const slateValue = this.state.richValue;
      //   this.props.editorApi.markdownLint(JSON.stringify(slateValue)).then((res) => {
      //     this.setState({
      //       issues: res.data
      //     });
      //   });
      // }
      this.lastModifyTime = new Date();
      const message = gettext('Successfully saved');
      toaster.success(message, {duration: 2,});

      this.props.editorApi.getFileInfo().then((res) => {
        this.props.setFileInfoMtime(res.data);
      });

      this.addParticipants();
    }, () => {
      this.props.onSaving(false);
      const message = gettext('Failed to save');
      toaster.danger(message, {duration: 2});
    });
  };

  onRichEditorSave = () => {
    if (this.props.isSaving) return; 
    const value = this.state.richValue;
    const str = serialize(value);
    this.saveContent(str);
    this.props.clearTimer();
    this.props.deleteDraft && this.props.deleteDraft();
  }

  onPlainEditorSave = () => {
    if (this.props.isSaving) return; 
    const str = this.state.currentContent;
    this.saveContent(str);
    this.props.clearTimer();
    this.props.deleteDraft && this.props.deleteDraft();
  }

  resetRichValue = () => {
    const value = this.state.richValue;
    this.setState({ richValue: value });
  }

  onChange = (value, operations) => {
    if (this.props.editorMode === 'rich') {
      this.setState({richValue: value,});
      this.props.setDraftValue('rich', this.state.richValue);
      const ops = operations.filter(o => {
        return o.type !== 'set_selection' && o.type !== 'set_value';
      });
      if (ops.length !== 0) {
        this.props.onContentChanged(true);
        if (this.autoSave) this.props.autoSaveDraft();
      }
    } else {
      this.setState({currentContent: value});
      this.props.onContentChanged(true);
      this.props.setDraftValue('rich', this.state.richValue);
      this.props.autoSaveDraft();
    }
  };

  addParticipants = () => {
    if (this.isParticipant || !window.showParticipants) return;
    const { userName, addFileParticipants } = this.props.editorApi;
    const { participants } = this.props;
    if (participants && participants.length !== 0) {
      this.isParticipant = participants.every((participant) => {
        return participant.email === userName;
      });
      if (this.isParticipant) return;
    }
    let emails = [userName];
    addFileParticipants(emails).then((res) => {
      this.isParticipant = true;
      this.props.onParticipantsChange();
    });
  }

  render() {

    if (this.props.editorMode === 'rich') {
      return (
        <RichMarkdownEditor
          scriptSource={this.props.scriptSource}
          readOnly={this.props.readOnly}
          value={this.state.richValue}
          editorApi={this.props.editorApi}
          fileInfo={this.props.fileInfo}
          collaUsers={this.props.collaUsers}
          onChange={this.onChange}
          onSave={this.onRichEditorSave}
          resetRichValue={this.resetRichValue}
          fileTagList={this.props.fileTagList}
          onFileTagChanged={this.props.onFileTagChanged}
          participants={this.props.participants}
          onParticipantsChange={this.props.onParticipantsChange}
          openDialogs={this.props.openDialogs}
        />
      );
    }

    return (
      <PlainMarkdownEditor
        scriptSource={this.props.scriptSource} 
        editorApi={this.props.editorApi}
        initialValue={this.state.initialPlainValue}
        currentContent={this.state.currentContent}
        contentChanged={this.props.contentChanged}
        fileInfo={this.props.fileInfo}
        collabUsers={this.props.collabUsers}
        onSave={this.onPlainEditorSave}
        onChange={this.onChange}
      />
    );
  }
}

SeafileEditor.propTypes = propTypes;

export default SeafileEditor;

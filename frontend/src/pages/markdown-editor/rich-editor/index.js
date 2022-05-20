import React from 'react';
import PropTypes from 'prop-types';
import { Toolbar, MarkdownEditor, UserHelp } from '@seafile/seafile-editor';
import EditorBuilder from '@seafile/seafile-editor/dist/editor/editor-builder';
import SidePanel from './side-panel';

import '../css/rich-editor.css';

const propTypes = {
  scriptSource: PropTypes.string,
  markdownContent: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  issues: PropTypes.object,
  fileInfo: PropTypes.object,
  readOnly: PropTypes.bool,
  editorApi: PropTypes.object,
  collabUsers: PropTypes.array,
  onSave: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  resetRichValue: PropTypes.func,
  fileTagList: PropTypes.array,
  onFileTagChanged: PropTypes.func,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

class RichEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowSidePanel: false,
      isShowHelpPanel: false,
      isSupportComment: false,
      relistComment: 0,
    };
    window.richMarkdownEditor = this;
  }

  toggleSidePanel = () => {
    this.setState({
      isShowSidePanel: !this.state.isShowSidePanel,
      isShowHelpPanel: false,
    });
  }

  showHelpDialog = () => {
    this.setState({isShowSidePanel: false, isShowHelpPanel: true});
  };

  hideHelpDialog = () => {
    this.setState({isShowHelpPanel: false});
  };

  toggleCommentBtn = (isSupport = false) => {
    this.setState({isSupportComment: isSupport});
  }

  onAddComment = () => {
    this.setState({relistComment: this.state.relistComment + 1});
  }

  insertRepoFile = () => {
    if (this.props.readOnly) return;
    this.props.openDialogs && this.props.openDialogs('insert_file');
  }

  addLink = (fileName, url, isImage) => {
    const editorRef = EditorBuilder.getEditorRef();
    editorRef.addLink(fileName, url, isImage);
  }

  render() {
    const hasSidePanel = true;
    const { isShowSidePanel, isShowHelpPanel } = this.state;
    const { value } = this.props;

    const isShowHelpWrapper = isShowSidePanel || isShowHelpPanel;
    const helpWrapperStyle = isShowHelpPanel ? {width: '350px'} : {};

    return (
      <div className='seafile-markdown-editor'>
        <div className='markdown-editor-toolbar'>
          <Toolbar 
            hasSidePanel={hasSidePanel}
            isShowSidePanel={isShowSidePanel}
            toggleSidePanel={this.toggleSidePanel}
            insertRepoFile={this.insertRepoFile}
          />
        </div>
        <div className='markdown-editor-content'>
          <div className={`markdown-editor-wrapper ${isShowHelpWrapper ? '' : 'full-screen'}`}>
            <MarkdownEditor
              scriptSource={this.props.scriptSource}
              value={value}
              editor={this.editor}
              onChange={this.props.onChange}
              resetRichValue={this.props.resetRichValue}
              isSupportComment={this.state.isSupportComment}
              onAddComment={this.onAddComment}
            />
          </div>
          <div className={`markdown-help-wrapper ${isShowHelpWrapper ? 'show' : ''}`} style={helpWrapperStyle}>
            {isShowSidePanel && (
              <SidePanel 
                document={value}
                fileInfo={this.props.fileInfo}
                relistComment={this.state.relistComment}
                fileTagList={this.props.fileTagList}
                onFileTagChanged={this.props.onFileTagChanged}
                participants={this.props.participants}
                onParticipantsChange={this.props.onParticipantsChange}
                toggleCommentBtn={this.toggleCommentBtn}
              />
            )}
            {isShowHelpPanel && <UserHelp hideHelpDialog={this.hideHelpDialog} />}
          </div>
        </div>
      </div>
    );
  }
}

RichEditor.propTypes = propTypes;


export default RichEditor;

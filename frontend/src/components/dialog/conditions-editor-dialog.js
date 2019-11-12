import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { SimpleEditor } from '@seafile/seafile-editor';
import getPreviewContent from '../../utils/markdown-utils';

const propTypes = {
  newValue: PropTypes.object,
  title: PropTypes.string.isRequired,
  onCommit: PropTypes.func.isRequired,
  onCloseEditorDialog: PropTypes.func.isRequired,
};

class ConditionsEditorDialog extends React.Component {

  constructor(props) {
    super(props);
    this.timer = null;
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      if (this.isContentChanged()) {
        let currentContent = this.getCurrentContent();
        this.props.onCommit(currentContent);
      }
    }, 6000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  onKeyDown = (event) => {
    event.stopPropagation();
  }

  toggle = () => {
    if (this.isContentChanged()) {
      let currentContent = this.getCurrentContent();
      this.props.onCommit(currentContent);
    }
    this.props.onCloseEditorDialog();
  }

  isContentChanged = () => {
    return this.simpleEditor.hasContentChange();
  }

  getCurrentContent = () => {
    let markdownContent = this.simpleEditor.getMarkdown();
    let { previewText , images, links } = getPreviewContent(markdownContent);
    let newValue = Object.assign({}, this.value, { text: markdownContent, preview: previewText, images: images, links: links });
    return newValue;
  }

  setSimpleEditorRef = (editor) => {
    this.simpleEditor = editor;
  }

  render() {
    let { newValue, title } = this.props;
    return (
      <Modal 
        isOpen={true} 
        toggle={this.toggle} 
        onKeyDown={this.onKeyDown}
        wrapClassName={'long-text-editor-dialog-wrapper'}
        className={'long-text-editor-dialog'}
        contentClassName={'long-text-editor-dialog-content'}
        size={'lg'}
        style={{width: 770}}
      >
        <ModalHeader className="long-text-editor-dialog-title" toggle={this.toggle}>{title}</ModalHeader>
        <ModalBody className={'long-text-editor-dialog-main'}>
          <SimpleEditor 
            onRef={this.setSimpleEditorRef.bind(this)}
            value={newValue.text}
          />
        </ModalBody>
      </Modal>
    );
  }
}

ConditionsEditorDialog.propTypes = propTypes;

export default ConditionsEditorDialog;

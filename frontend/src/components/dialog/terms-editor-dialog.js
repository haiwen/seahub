import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { SimpleEditor } from '@seafile/seafile-editor';
import { gettext } from '../../utils/constants';

const propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  onCommit: PropTypes.func.isRequired,
  onCloseEditorDialog: PropTypes.func.isRequired,
};

class TermsEditorDialog extends React.Component {

  static defaultProps = {
    title: gettext('Terms'),
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
    return markdownContent;
  }

  setSimpleEditorRef = (editor) => {
    this.simpleEditor = editor;
  }

  render() {
    let { content, title } = this.props;
    return (
      <Modal
        isOpen={true}
        toggle={this.toggle}
        onKeyDown={this.onKeyDown}
        wrapClassName={'conditions-editor-dialog-wrapper'}
        className={'conditions-editor-dialog'}
        contentClassName={'conditions-editor-dialog-content'}
        size={'lg'}
        style={{width: 770}}
      >
        <ModalHeader className="conditions-editor-dialog-title" toggle={this.toggle}>{title}</ModalHeader>
        <ModalBody className={'conditions-editor-dialog-main'}>
          <SimpleEditor
            onRef={this.setSimpleEditorRef.bind(this)}
            value={content || ''}
          />
        </ModalBody>
      </Modal>
    );
  }
}

TermsEditorDialog.propTypes = propTypes;

export default TermsEditorDialog;

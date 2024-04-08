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

  constructor(props) {
    super(props);
    this.state = {
      isValueChanged: false,
    };
    this.editorRef = React.createRef();
  }

  static defaultProps = {
    title: gettext('Terms'),
  };

  onKeyDown = (event) => {
    event.stopPropagation();
  };

  toggle = () => {
    const { isValueChanged } = this.state;
    if (isValueChanged) {
      let currentContent = this.getCurrentContent();
      this.props.onCommit(currentContent);
    }
    this.props.onCloseEditorDialog();
  };

  onContentChanged = () => {
    return this.setState({isValueChanged: true});
  };

  getCurrentContent = () => {
    return this.editorRef.current.getValue();
  };

  setSimpleEditorRef = (editor) => {
    this.simpleEditor = editor;
  };

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
            ref={this.editorRef}
            value={content || ''}
            onContentChanged={this.onContentChanged}
          />
        </ModalBody>
      </Modal>
    );
  }
}

TermsEditorDialog.propTypes = propTypes;

export default TermsEditorDialog;

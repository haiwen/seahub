import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext, isDocs } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  fileType: PropTypes.string,
  parentPath: PropTypes.string.isRequired,
  onAddFile: PropTypes.func.isRequired,
  checkDuplicatedName: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class CreateFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: props.fileType || '',
      isMarkdownDraft: false,
      isSdocDraft: false,
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  componentDidMount() {
    let parentPath = this.props.parentPath;
    if (parentPath[parentPath.length - 1] === '/') {  // mainPanel
      this.setState({parentPath: parentPath});
    } else {
      this.setState({parentPath: parentPath + '/'}); // sidePanel
    }
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({
      childName: e.target.value,
    }) ;
  };

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) {
      return;
    }

    let isDuplicated = this.checkDuplicatedName();
    let newName = this.state.childName;

    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      this.setState({errMessage: errMessage});
    } else {
      let path = this.state.parentPath + newName;
      const { isMarkdownDraft, isSdocDraft } = this.state;
      this.props.onAddFile(path, isMarkdownDraft, isSdocDraft);
      this.props.toggleDialog();
    }
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  handleCheck = () => {
    let pos = this.state.childName.lastIndexOf('.');

    if (this.state.isMarkdownDraft) {
      // from draft to not draft
      // case 1, normally, the file name is ended with `(draft)`, like `test(draft).md`
      // case 2, the file name is not ended with `(draft)`, the user has deleted some characters, like `test(dra.md`
      let p = this.state.childName.substring(pos-7, pos);
      let fileName = this.state.childName.substring(0, pos-7);
      let fileType = this.state.childName.substring(pos);
      if (p === '(draft)') {
        // remove `(draft)` from file name
        this.setState({
          childName: fileName + fileType,
          isMarkdownDraft: !this.state.isMarkdownDraft
        });
      } else {
        // don't change file name
        this.setState({
          isMarkdownDraft: !this.state.isMarkdownDraft
        });
      }
    }

    if (!this.state.isMarkdownDraft) {
      // from not draft to draft
      // case 1, test.md  ===> test(draft).md
      // case 2, .md ===> (draft).md
      // case 3, no '.' in the file name, don't change the file name
      if (pos > 0) {
        let fileName = this.state.childName.substring(0, pos);
        let fileType = this.state.childName.substring(pos);
        this.setState({
          childName: fileName + '(draft)' + fileType,
          isMarkdownDraft: !this.state.isMarkdownDraft
        });
      } else if (pos === 0 ) {
        this.setState({
          childName: '(draft)' + this.state.childName,
          isMarkdownDraft: !this.state.isMarkdownDraft
        });
      } else {
        this.setState({
          isMarkdownDraft: !this.state.isMarkdownDraft
        });
      }
    }
  };

  checkDuplicatedName = () => {
    let isDuplicated = this.props.checkDuplicatedName(this.state.childName);
    return isDuplicated;
  };

  onAfterModelOpened = () => {
    if (!this.newInput.current) return;
    this.newInput.current.focus();
    this.newInput.current.setSelectionRange(0,0);
  };

  toggleMarkSdocDraft = (e) => {
    this.setState({
      isSdocDraft: e.target.checked
    });
  };

  render() {
    const { isSdocDraft } = this.state;
    const { toggleDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={toggleDialog} onOpened={this.onAfterModelOpened}>
        <ModalHeader toggle={toggleDialog}>{gettext('New File')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="fileName">{gettext('Name')}</Label>
              <Input
                id="fileName"
                onKeyPress={this.handleKeyPress}
                innerRef={this.newInput}
                value={this.state.childName}
                onChange={this.handleChange}
              />
            </FormGroup>
            {this.props.fileType == '.md' && isDocs && (
              <FormGroup check>
                <Label check>
                  <Input type="checkbox" onChange={this.handleCheck}/>{'  '}{gettext('This is a draft')}
                </Label>
              </FormGroup>
            )}
            {/*this.props.fileType == '.sdoc' && (
              <FormGroup check>
                <Label check>
                  <Input type="checkbox" checked={isSdocDraft} onChange={this.toggleMarkSdocDraft}/>
                  <span>{gettext('Mark as draft')}</span>
                </Label>
              </FormGroup>
            )*/}
          </Form>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateFile.propTypes = propTypes;

export default CreateFile;

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  fileType: PropTypes.string,
  parentPath: PropTypes.string.isRequired,
  onAddFile: PropTypes.func.isRequired,
  addFileCancel: PropTypes.func.isRequired,
};

class CreateFile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      parentPath: '',
      childName: props.fileType,
      isDraft: false,
    };
    this.newInput = React.createRef();
  }

  handleChange = (e) => {
    this.setState({
      childName: e.target.value, 
    }) ;
  }

  handleSubmit = () => {
    let path = this.state.parentPath + this.state.childName;
    let isDraft = this.state.isDraft;
    this.props.onAddFile(path, isDraft);
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  handleCheck = () => {
    let pos = this.state.childName.lastIndexOf('.');
    
    if (this.state.isDraft) {
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
          isDraft: !this.state.isDraft
        });
      } else {
        // don't change file name
        this.setState({
          isDraft: !this.state.isDraft
        });
      }
    }
    
    if (!this.state.isDraft) {
      // from not draft to draft
      // case 1, test.md  ===> test(draft).md
      // case 2, .md ===> (draft).md
      // case 3, no '.' in the file name, don't change the file name
      if (pos > 0) {
        let fileName = this.state.childName.substring(0, pos);
        let fileType = this.state.childName.substring(pos);
        this.setState({
          childName: fileName + '(draft)' + fileType,
          isDraft: !this.state.isDraft
        });
      } else if (pos === 0 ) {
        this.setState({
          childName: '(draft)' + this.state.childName, 
          isDraft: !this.state.isdraft
        });
      } else {
        this.setState({
          isDraft: !this.state.isdraft
        });
      } 
    }
  }

  toggle = () => {
    this.props.addFileCancel();
  }

  componentDidMount() {
    let parentPath = this.props.parentPath;
    if (parentPath[parentPath.length - 1] === '/') {  // mainPanel
      this.setState({parentPath: parentPath});
    } else {
      this.setState({parentPath: parentPath + '/'}); // sidePanel
    }
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New File')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="fileName">{gettext('Name')}</Label>
              <Input 
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                id="fileName" 
                placeholder={gettext('new name')} 
                value={this.state.childName} 
                onChange={this.handleChange}
              />
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" onChange={this.handleCheck}/>{'  '}{gettext('This is a draft.')}
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateFile.propTypes = propTypes;

export default CreateFile;

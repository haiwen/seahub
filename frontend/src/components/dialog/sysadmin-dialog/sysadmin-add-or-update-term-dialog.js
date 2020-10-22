import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Alert, FormGroup, Label } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import TermsPreviewWidget from '../../terms-preview-widget';
import TermsEditorDialog from '../terms-editor-dialog';

import '../../../css/terms-conditions-editor.css';

const propTypes = {
  isUpdate: PropTypes.bool,
  oldTermObj: PropTypes.object,
  addTerm: PropTypes.func,
  updateTerm: PropTypes.func,
  toggle: PropTypes.func.isRequired,
};

class AddOrUpdateTermDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      versionNumber: '',
      text: '',
      isActive: true,
      errorMsg: '',
      isConditionsEditorDialogShow: false,
    };
  }

  componentDidMount() {
    let oldTermObj = this.props.oldTermObj;
    if (oldTermObj) {
      this.setState({
        name: oldTermObj.name,
        versionNumber: oldTermObj.version_number,
        text: oldTermObj.text,
        isActive: !(oldTermObj.activate_time === ''),
      });
    }
  }

  handleNameChange = (e) => {
    this.setState({name: e.target.value.trim()});
  }

  handleVersionNumberChange = (e) => {
    this.setState({versionNumber: e.target.value.trim()});
  }

  handleTextChange = (e) => {
    this.setState({text: e.target.value.trim()});
  }

  setActive = () => {
    this.setState({isActive: true});
  }

  setInActive = () => {
    this.setState({isActive: false});
  }

  addTerm = () => {
    let { name, versionNumber, text, isActive } = this.state;
    if (name === '') {
      this.setState({errMsg: gettext('Name is required.')});
      return;
    }
    if (versionNumber === '') {
      this.setState({errMsg: gettext('Version Number is required.')});
      return;
    }
    if (isNaN(versionNumber)) {
      this.setState({errMsg: gettext('Version Number must be a number.')});
      return;
    }
    if (text === '') {
      this.setState({errMsg: gettext('Text is required.')});
      return;
    }
    if (this.props.isUpdate) {
      this.props.updateTerm(name, versionNumber, text, isActive);
    } else {
      this.props.addTerm(name, versionNumber, text, isActive);
    }
  }

  onContentClick = () => {
    this.setState({isConditionsEditorDialogShow: !this.state.isConditionsEditorDialogShow});
  }

  onCloseEditorDialog = () => {
    this.setState({isConditionsEditorDialogShow: false});
  }

  onUpdateContent = (content) => {
    this.setState({ text: content });
  }

  render() {
    let title = this.props.isUpdate ? gettext('Update Terms and Conditions') : gettext('Add Terms and Conditions');
    return (
      <Fragment>
        <Modal isOpen={true} toggle={this.props.toggle}>
          <ModalHeader toggle={this.props.toggle}>{title}</ModalHeader>
          <ModalBody>
            <FormGroup>
              <Label for="name">{gettext('Name')}</Label>
              <Input id="name" value={this.state.name} onChange={this.handleNameChange}/>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Version Number')}</Label>
              <Input value={this.state.versionNumber} onChange={this.handleVersionNumberChange}/>
            </FormGroup>
            <FormGroup className="form-content">
              <Label>{gettext('Text')}</Label>
              <TermsPreviewWidget content={this.state.text} onContentClick={this.onContentClick}/>
            </FormGroup>
            <FormGroup tag="fieldset">
              <Label>{gettext('Activated')}</Label>
              <FormGroup check>
                <Label check>
                  <Input type="radio" checked={this.state.isActive} onChange={this.setActive} />
                  {' '}{gettext('On')}
                </Label>
              </FormGroup>
              <FormGroup check>
                <Label check>
                  <Input type="radio" checked={!this.state.isActive} onChange={this.setInActive} />
                  {' '}{gettext('Off')}
                </Label>
              </FormGroup>
            </FormGroup>
            {this.state.errMsg && <Alert color="danger">{this.state.errMsg}</Alert>}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.addTerm}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Modal>
        {this.state.isConditionsEditorDialogShow && (
          <TermsEditorDialog
            content={this.state.text}
            onCommit={this.onUpdateContent}
            onCloseEditorDialog={this.onCloseEditorDialog}
          />
        )}
      </Fragment>
    );
  }
}

AddOrUpdateTermDialog.propTypes = propTypes;

export default AddOrUpdateTermDialog;

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Alert, FormGroup, Label } from 'reactstrap';
import { gettext } from '../../../utils/constants';

class AddOrUpdateTermDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      versionNumber: '',
      text: '',
      isActive: true,
      errorMsg: '',
    };
  }

  componentDidMount() {
    if (this.props.oldTermObj) {
      this.setState({
        name: this.props.oldTermObj.name,
        versionNumber: this.props.oldTermObj.version_number,
        text: this.props.oldTermObj.text,
        isActive: !(this.props.oldTermObj.activate_time === ''),
      });
    }
  }

  handleNameChange = (e) => {
    this.setState({
      name: e.target.value.trim(),
      errMsg: ''
    });
  }

  handleVersionNumberChange = (e) => {
    this.setState({
      versionNumber: e.target.value.trim(),
      errMsg: ''
    });
  }

  handleTextChange = (e) => {
    this.setState({
      text: e.target.value.trim(),
      errMsg: ''
    });
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

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>
          {this.props.isUpdate ? gettext('Update Terms and Conditions') : gettext('Add Terms and Conditions')}
        </ModalHeader>
        <ModalBody>
          {gettext('Name')}
          <Input
            value={this.state.name}
            onChange={this.handleNameChange}
          />
          <br/>
          {gettext('Version Number')}
          <Input
            value={this.state.versionNumber}
            onChange={this.handleVersionNumberChange}
          />
          <br/>
          {gettext('Text')}<br/>
          <textarea
            value={this.state.text}
            onChange={this.handleTextChange}
            cols="55"
          />
          <br/>
          <br/>
          {gettext('Activated')}
          <FormGroup tag="fieldset">
            <FormGroup check>
              <Label check>
                <Input type="radio" checked={this.state.isActive} onChange={this.setActive} />{' '}On</Label>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input type="radio" checked={!this.state.isActive} onChange={this.setInActive} />{' '}Off</Label>
            </FormGroup>
          </FormGroup>
          {this.state.errMsg && <Alert color="danger">{this.state.errMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.addTerm}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addTerm: PropTypes.func,
  isUpdate: PropTypes.bool,
  oldTermObj: PropTypes.object,
  updateTerm: PropTypes.func,
};

AddOrUpdateTermDialog.propTypes = propTypes;

export default AddOrUpdateTermDialog;

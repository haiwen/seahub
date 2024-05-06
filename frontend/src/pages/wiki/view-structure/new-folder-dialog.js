import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
// import SelectIcon from './select-icon';
import { gettext } from '../../../utils/constants';

export default class NewFolderDialog extends Component {

  static propTypes = {
    onAddFolder: PropTypes.func,
    onToggleAddFolderDialog: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      folderName: '',
      errMessage: '',
      iconClassName: '',
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onHotKey);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onHotKey);
  }

  onHotKey = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handleChange = (event) => {
    let { folderName } = this.state;
    let value = event.target.value;
    if (value === folderName) {
      return;
    }
    this.setState({ folderName: value });
  };

  handleSubmit = () => {
    let { folderName, iconClassName } = this.state;
    if (!folderName) {
      this.setState({ errMessage: gettext('Name_is_required') });
      return;
    }
    this.props.onAddFolder({ name: folderName, icon: iconClassName });
    this.props.onToggleAddFolderDialog();
  };

  toggle = () => {
    this.props.onToggleAddFolderDialog();
  };

  onIconChange = (className) => {
    this.setState({ iconClassName: className });
  };

  render() {
    const { folderName, errMessage } = this.state;
    return (
      <Modal
        isOpen={true}
        toggle={this.toggle}
        autoFocus={false}
        className="new-folder-dialog"
      >
        <ModalHeader toggle={this.toggle}>{gettext('New folder')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="folderName">{gettext('Name')}</Label>
              <Input
                id="folderName"
                value={folderName}
                innerRef={input => {
                  this.newInput = input;
                }}
                onChange={this.handleChange}
                autoFocus={true}
              />
            </FormGroup>
            {/* <FormGroup>
              <SelectIcon
                onIconChange={this.onIconChange}
                iconClassName={this.state.iconClassName}
              />
            </FormGroup> */}
          </Form>
          {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

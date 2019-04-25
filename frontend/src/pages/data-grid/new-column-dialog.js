import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Alert, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  onNewColumnCancel: PropTypes.func,
  onNewColumn: PropTypes.func,
};

class NewCoumnDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      columnType: 'text',
      columnName: '',
      errMessage: '',
    };
  }

  handleChange = (event) => {
    let value = event.target.value.trim();
    this.setState({columnName: value});
  }

  onSelectChange = (event) => {
    let type = event.target.value;
    this.setState({columnType: type});
  }

  toggle = () => {
    this.props.onNewColumnCancel();
  }

  handleSubmit = () => {
    let { columnName, columnType } = this.state;
    if (!columnName) {
      this.setState({errMessage: gettext('Name is required.')});
      return;
    }
    this.props.onNewColumn(columnName, columnType);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader>{gettext('New Column')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="columnName">{gettext('Name')}</Label>
              <Input id="columnName" value={this.state.columnName} innerRef={input => {this.newInput = input;}} onChange={this.handleChange} />
            </FormGroup>
            <FormGroup>
              <Label for="typeSelect">{gettext('type')}</Label>
              <Input id="typeSelect" type='select' name="select" onChange={this.onSelectChange}>
                <option vlaue="text">{gettext('text')}</option>
                <option value="number">{gettext('number')}</option>
              </Input>
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>          
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

NewCoumnDialog.propTypes = propTypes;

export default NewCoumnDialog;

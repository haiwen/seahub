import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Form, FormGroup, Input, Label } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

class SysAdminUserDeactivateDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      keepSharing: true
    };
  }

  handleOptionChange = (e) => {
    this.setState({ keepSharing: e.target.value === 'true' });
  };

  submit = () => {
    this.props.onSubmit(this.state.keepSharing);
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          {gettext('Set user inactive')}
        </SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup tag="fieldset">
              <p>{gettext('Do you want to keep the library sharing relationships?')}</p>
              <FormGroup check>
                <Label check>
                  <Input
                    type="radio"
                    name="keepSharing"
                    value="true"
                    checked={this.state.keepSharing === true}
                    onChange={this.handleOptionChange}
                    className="mr-2"
                  />
                  {gettext('Keep sharing')}
                </Label>
              </FormGroup>
              <FormGroup check>
                <Label check>
                  <Input
                    type="radio"
                    name="keepSharing"
                    value="false"
                    checked={this.state.keepSharing === false}
                    onChange={this.handleOptionChange}
                    className="mr-2"
                  />
                  {gettext('Do not keep sharing')}
                </Label>
              </FormGroup>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminUserDeactivateDialog.propTypes = propTypes;

export default SysAdminUserDeactivateDialog;

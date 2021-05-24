import React from 'react';
import PropTypes from 'prop-types';
import { gettext, isPro } from '../../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  unlinkDevice: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SysAdminUnlinkDevice extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inputChecked: false
    };
  }

  handleInputChange = (e) => {
    this.setState({
      inputChecked: e.target.checked
    });
  }

  unlinkDevice = () => {
    this.props.toggleDialog();
    this.props.unlinkDevice(this.state.inputChecked);
  }

  render() {
    const { inputChecked } = this.state;
    const toggle = this.props.toggleDialog;
    return (
      <Modal isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{gettext('Unlink device')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to unlink this device?')}</p>
          {isPro &&
          <div className="d-flex align-items-center">
            <input id="delete-files" className="mr-1" type="checkbox" checked={inputChecked} onChange={this.handleInputChange} />
            <label htmlFor="delete-files" className="m-0">{gettext('Delete files from this device the next time it comes online.')}</label>
          </div>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.unlinkDevice}>{gettext('Unlink')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminUnlinkDevice.propTypes = propTypes;

export default SysAdminUnlinkDevice;

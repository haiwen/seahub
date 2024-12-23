import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  formActionURL: PropTypes.string.isRequired,
  csrfToken: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired
};

class ConfirmDisconnectWeixin extends Component {

  constructor(props) {
    super(props);
    this.form = React.createRef();
  }

  disconnect = () => {
    this.form.current.submit();
  };

  render() {
    const { formActionURL, csrfToken, toggle } = this.props;
    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>{gettext('Disconnect')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to disconnect?')}</p>
          <form ref={this.form} className="d-none" method="post" action={formActionURL}>
            <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.disconnect}>{gettext('Disconnect')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ConfirmDisconnectWeixin.propTypes = propTypes;

export default ConfirmDisconnectWeixin;

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

class ConfirmDeleteAccount extends Component {

  constructor(props) {
    super(props);
    this.form = React.createRef();
  }

  action = () => {
    this.form.current.submit();
  };

  render() {
    const { formActionURL, csrfToken, toggle } = this.props;
    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>{gettext('Delete Account')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Really want to delete your account?')}</p>
          <form ref={this.form} className="d-none" method="post" action={formActionURL}>
            <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.action}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ConfirmDeleteAccount.propTypes = propTypes;

export default ConfirmDeleteAccount;

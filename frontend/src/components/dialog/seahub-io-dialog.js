import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Loading from '../loading';

import '../../css/seahub-io-dialog.css';


const propTypes = {
  toggle: PropTypes.func.isRequired,
};

class SeahubIODialog extends React.Component {

  toggle = () => {
    this.props.toggle();
  };

  render() {
    return (
      <Modal className='seahub-io-dialog' isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          {gettext('Exporting')}
        </ModalHeader>
        <ModalBody>
          <>
            <Loading/>
            <div className="seahub-io-dialog-parsing-text">{gettext('Exporting log file...')}</div>
          </>
        </ModalBody>
      </Modal>
    );
  }
}

SeahubIODialog.propTypes = propTypes;

export default SeahubIODialog;

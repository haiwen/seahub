import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Loading from '../loading';

import '../../css/seahub-io-dialog.css';


const propTypes = {
  toggle: PropTypes.func.isRequired,
};

class WikiConvertStatusDialog extends React.Component {

  toggle = () => {
    this.props.toggle();
  };

  render() {
    return (
      <Modal className='seahub-io-dialog' isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          {gettext('Converting')}
        </ModalHeader>
        <ModalBody>
          <>
            <Loading/>
            <div className="seahub-io-dialog-parsing-text">{gettext('Converting...')}</div>
          </>
        </ModalBody>
      </Modal>
    );
  }
}

WikiConvertStatusDialog.propTypes = propTypes;

export default WikiConvertStatusDialog;

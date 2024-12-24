import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Loading from '../loading';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

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
        <SeahubModalHeader toggle={this.toggle}>
          {gettext('Exporting')}
        </SeahubModalHeader>
        <ModalBody>
          <>
            <Loading/>
            <div className="seahub-io-dialog-parsing-text">{gettext('Exporting...')}</div>
          </>
        </ModalBody>
      </Modal>
    );
  }
}

SeahubIODialog.propTypes = propTypes;

export default SeahubIODialog;

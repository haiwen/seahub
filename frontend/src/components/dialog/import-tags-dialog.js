import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '../../utils/constants';
import Loading from '../loading';

import '../../css/seahub-io-dialog.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
};

class ImportTagsDialog extends React.Component {
  constructor(props) {
    super(props);
  }

  toggle = () => {
    this.props.toggleDialog();
  };


  render() {
    return (
      <Modal className='seahub-io-dialog' isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Import tags')}</SeahubModalHeader>
        <ModalBody>
          <>
            <Loading/>
            <div className="seahub-io-dialog-parsing-text">{gettext('Importing tags...')}</div>
          </>
        </ModalBody>
      </Modal>
    );
  }
}

ImportTagsDialog.propTypes = propTypes;

export default ImportTagsDialog;

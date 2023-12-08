import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { withTranslation } from 'react-i18next';

class DeleteSeatablesDialog extends Component {

  static propTypes = {
    t: PropTypes.func,
    accountName: PropTypes.string,
    onDeleteSeatables: PropTypes.func,
    closeDialog: PropTypes.func,
  };

  render () {
    const { t, accountName, closeDialog } = this.props;
    return (
      <Modal isOpen={true} toggle={closeDialog}>
        <ModalHeader toggle={closeDialog}>{t('Delete SeaTable base')}</ModalHeader>
        <ModalBody>
          <div className="pb-6">{t(`Are you sure to delete SeaTable_${accountName}`)}</div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeDialog}>{t('Cancel')}</Button>
          <Button color="primary" onClick={this.props.onDeleteSeatables}>{t('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

export default withTranslation('dtable')(DeleteSeatablesDialog);

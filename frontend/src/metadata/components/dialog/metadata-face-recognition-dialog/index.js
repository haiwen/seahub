import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../../../utils/constants';
import metadataAPI from '../../../api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';

const MetadataFaceRecognitionDialog = ({ value, repoID, toggle, submit }) => {
  const [submitting, setSubmitting] = useState(false);

  const onToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  const onSubmit = useCallback(() => {
    setSubmitting(true);
    metadataAPI.openFaceRecognition(repoID).then(res => {
      submit(true);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
    submit();
  }, [repoID, submit, toggle]);

  return (
    <Modal className="metadata-face-recognition-dialog" isOpen={true} toggle={onToggle}>
      <ModalHeader toggle={onToggle}>{gettext('Face recognition')}</ModalHeader>
      <ModalBody>
        {value ? gettext('Face recognition enabled.') : gettext('Whether to enable face recognition?')}
      </ModalBody>
      {!value && (
        <ModalFooter>
          <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
          <Button color="primary" disabled={submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

MetadataFaceRecognitionDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataFaceRecognitionDialog;

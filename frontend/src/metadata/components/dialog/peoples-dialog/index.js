import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, FormGroup, Label } from 'reactstrap';
import { CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import People from './people';

import './index.css';
import { useMetadataView } from '../../../hooks/metadata-view';


const PeoplesDialog = ({ selectedImages, onToggle, onSubmit }) => {
  const [selectedPeople, setSelectedPeople] = useState(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const { metadata } = useMetadataView();

  const peopleOptions = useMemo(() => {
    return metadata.rows.filter(people => people._is_someone).map(people => {
      return {
        value: people._id,
        label: (<People people={people} />),
      };
    });
  }, [metadata]);

  const onSelectPeople = useCallback((o) => {
    if (o === selectedPeople) return;
    setSelectedPeople(o);
  }, [selectedPeople]);

  const handelSubmit = useCallback(() => {
    setSubmitting(true);
    onSubmit(selectedPeople, selectedImages, {
      success_callback: onToggle,
      fail_callback: () => setSubmitting(false),
    });
  }, [selectedImages, selectedPeople, onToggle, onSubmit]);

  const selectedValue = peopleOptions.find(o => o.value === selectedPeople);

  return (
    <Modal isOpen={true} toggle={() => onToggle()} className="sf-metadata-peoples-dialog">
      <ModalHeader toggle={() => onToggle()}>{gettext('People')}</ModalHeader>
      <ModalBody>
        <FormGroup className="">
          <Label>{gettext('People')}</Label>
          <CustomizeSelect value={selectedValue} options={peopleOptions} onSelectOption={onSelectPeople} />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => onToggle()}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={isSubmitting || !selectedPeople} onClick={handelSubmit}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

PeoplesDialog.propTypes = {
  onToggle: PropTypes.func,
  selectedImages: PropTypes.array,
};

export default PeoplesDialog;

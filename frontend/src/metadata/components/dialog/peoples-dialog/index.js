import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, FormGroup, Label } from 'reactstrap';
import { CustomizeSelect, Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { useMetadataView } from '../../../hooks/metadata-view';
import People from './people';

import './index.css';


const PeoplesDialog = ({ selectedImages, onToggle, onSubmit }) => {
  const [selectedPeopleIds, setSelectedPeopleIds] = useState([]);
  const [isSubmitting, setSubmitting] = useState(false);

  const { metadata } = useMetadataView();

  const peopleOptions = useMemo(() => {
    return metadata.rows.filter(people => people._is_someone).map(people => {
      const isSelected = selectedPeopleIds.some(id => id === people._id);
      return {
        value: people._id,
        label: (
          <div className="select-option-people">
            <div className='people-check-icon'>
              {isSelected && (<Icon iconName="check-mark" />)}
            </div>
            <People people={people} />
          </div>
        ),
      };
    });
  }, [metadata, selectedPeopleIds]);

  const selectedValue = useMemo(() => {
    return Array.isArray(selectedPeopleIds) && selectedPeopleIds.length > 0 && selectedPeopleIds.map(id => {
      const people = metadata.rows.find(people => people._id === id);
      if (!people) return null;
      return <People people={people} />;
    });
  }, [selectedPeopleIds, metadata]);

  const onSelectPeople = useCallback((value) => {
    if (selectedPeopleIds.some(id => id === value)) {
      setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== value));
    } else {
      setSelectedPeopleIds([...selectedPeopleIds, value]);
    }
  }, [selectedPeopleIds]);

  const handelSubmit = useCallback(() => {
    setSubmitting(true);
    onSubmit(selectedPeopleIds, selectedImages, {
      success_callback: onToggle,
      fail_callback: () => setSubmitting(false),
    });
  }, [selectedImages, selectedPeopleIds, onToggle, onSubmit]);

  return (
    <Modal isOpen={true} toggle={() => onToggle()} className="sf-metadata-peoples-dialog">
      <SeahubModalHeader toggle={() => onToggle()}>{gettext('People')}</SeahubModalHeader>
      <ModalBody>
        <FormGroup className="">
          <Label>{gettext('People')}</Label>
          <CustomizeSelect
            value={selectedValue ? { label: selectedValue } : {}}
            options={peopleOptions}
            onSelectOption={onSelectPeople}
            supportMultipleSelect={true}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => onToggle()}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={isSubmitting || !selectedPeopleIds.length} onClick={handelSubmit}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

PeoplesDialog.propTypes = {
  onToggle: PropTypes.func,
  selectedImages: PropTypes.array,
};

export default PeoplesDialog;

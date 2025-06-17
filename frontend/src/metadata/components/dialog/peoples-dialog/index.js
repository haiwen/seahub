import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, FormGroup, Label } from 'reactstrap';
import Icon from '../../../../components/icon';
import CustomizeSelect from '../../../../components/customize-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import People from './people';
import { gettext } from '../../../../utils/constants';
import { useMetadataView } from '../../../hooks/metadata-view';

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
            <People people={people} />
            <div className="people-check-icon">
              {isSelected && (<Icon symbol="check-mark" />)}
            </div>
          </div>
        ),
      };
    });
  }, [metadata, selectedPeopleIds]);

  const onSelectPeople = useCallback((value) => {
    if (selectedPeopleIds.some(id => id === value)) {
      setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== value));
    } else {
      setSelectedPeopleIds([...selectedPeopleIds, value]);
    }
  }, [selectedPeopleIds]);

  const handleSubmit = useCallback(() => {
    setSubmitting(true);
    onSubmit(selectedPeopleIds, selectedImages, {
      success_callback: onToggle,
      fail_callback: () => setSubmitting(false),
    });
  }, [selectedImages, selectedPeopleIds, onToggle, onSubmit]);

  const onDelete = useCallback((event, people) => {
    event.stopPropagation();
    setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== people._id));
  }, [selectedPeopleIds]);

  const selectedValue = useMemo(() => {
    return (
      <div className="sf-metadata-delete-people">
        {Array.isArray(selectedPeopleIds) && selectedPeopleIds.length > 0 && selectedPeopleIds.map(id => {
          const people = metadata.rows.find(people => people._id === id);
          if (!people) return null;
          return <People key={id} people={people} isCancellable={true} onDelete={onDelete} />;
        })}
      </div>
    );
  }, [selectedPeopleIds, metadata, onDelete]);

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
            searchable={true}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={() => onToggle()}>{gettext('Cancel')}</Button>
        <Button color="primary" disabled={isSubmitting || !selectedPeopleIds.length} onClick={handleSubmit}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

PeoplesDialog.propTypes = {
  onToggle: PropTypes.func,
  selectedImages: PropTypes.array,
  onSubmit: PropTypes.func,
};

export default PeoplesDialog;

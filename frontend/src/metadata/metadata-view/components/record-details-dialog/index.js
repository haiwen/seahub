import React from 'react';
import RecordDetails from './record-details';
import { useMetadata, useRecordDetails } from '../../hooks';

const RecordDetailsDialog = () => {
  const { isShowRecordDetails, recordDetails, closeRecordDetails } = useRecordDetails();
  const { metadata } = useMetadata();
  if (!isShowRecordDetails) return null;
  const props = {
    record: recordDetails,
    fields: metadata.view.columns,
    onToggle: closeRecordDetails,
  };
  return (<RecordDetails { ...props } />);
};

export default RecordDetailsDialog;

import React from 'react';
import { RecordDetails } from '@seafile/sf-metadata-ui-component';
import { useCollaborators, useMetadata, useRecordDetails } from '../../hooks';
import { COLUMNS_ICON_CONFIG } from '../../_basic';

const RecordDetailsDialog = () => {
  const { isShowRecordDetails, recordDetails, closeRecordDetails } = useRecordDetails();
  const { collaborators, collaboratorsCache, updateCollaboratorsCache } = useCollaborators();
  const { metadata } = useMetadata();
  if (!isShowRecordDetails) return null;
  const props = {
    collaborators,
    collaboratorsCache,
    updateCollaboratorsCache,
    queryUserAPI: window.sfMetadataContext.userService.queryUser,
    record: recordDetails,
    fields: metadata.columns,
    fieldIconConfig: COLUMNS_ICON_CONFIG,
    onToggle: closeRecordDetails,
  };
  return (<RecordDetails { ...props } />);
};

export default RecordDetailsDialog;

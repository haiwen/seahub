import React, { useCallback, useMemo, useRef } from 'react';
import Icon from '../../../components/icon';
import CustomDropdown from '../../../components/dropdown';
import { useMetadataDetails } from '../../hooks';
import { useMetadataStatus, useMetadataAIOperations } from '../../../hooks';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { getFileNameFromRecord, getFileObjIdFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import { getColumnByKey } from '../../utils/column';
import { PRIVATE_COLUMN_KEY } from './constants';
import { checkIsDir } from '../../utils/row';
import Tooltip from '@/components/tooltip';

const OPERATION = {
  GENERATE_DESCRIPTION: 'generate-description',
  OCR: 'ocr',
  FILE_TAGS: 'file-tags',
  FILE_DETAIL: 'file-detail',
};

const AIIcon = () => {
  const forwardedRef = useRef({});

  const { enableMetadata, enableTags } = useMetadataStatus();
  const { canModifyRecord, columns, record, onChange, onLocalRecordChange, updateFileTags, updateDescription } = useMetadataDetails();
  const { generateDescription, extractFileDetails, onOCR, generateFileTags } = useMetadataAIOperations();

  const handleOperation = useCallback((item) => {
    const { opData } = item;
    if (!opData) return;
    const { type: opType, record } = opData;
    const recordId = getRecordIdFromRecord(record);
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    const objId = getFileObjIdFromRecord(record);

    switch (opType) {
      case OPERATION.GENERATE_DESCRIPTION: {
        generateDescription({ parentDir, fileName, recordId }, {
          success_callback: ({ description }) => {
            if (!description) return;
            onChange && onChange(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, description);
          },
        });
        break;
      }
      case OPERATION.OCR: {
        onOCR(record, {
          success_callback: updateDescription
        }, forwardedRef.current?.dropdownRef?.current);
        break;
      }
      case OPERATION.FILE_TAGS: {
        generateFileTags(record, {
          success_callback: updateFileTags
        });
        break;
      }
      case OPERATION.FILE_DETAIL: {
        extractFileDetails(objId, {
          success_callback: ({ detail }) => {
            if (!detail) return;
            const captureColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);
            if (captureColumn) {
              const value = detail[PRIVATE_COLUMN_KEY.CAPTURE_TIME];
              value && onChange && onChange(PRIVATE_COLUMN_KEY.CAPTURE_TIME, value);
            }
            const fileDetails = detail[PRIVATE_COLUMN_KEY.FILE_DETAILS];
            const location = detail[PRIVATE_COLUMN_KEY.LOCATION];
            const address = detail[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
            let update = {};
            if (fileDetails) {
              update[PRIVATE_COLUMN_KEY.FILE_DETAILS] = fileDetails;
            }
            if (location) {
              update[PRIVATE_COLUMN_KEY.LOCATION] = location;
            }
            if (address) {
              update[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = address;
            }
            if (Object.keys(update).length > 0) {
              onLocalRecordChange({ recordId, parentDir, fileName }, update);
            }
          },
        });
        break;
      }
    }
  }, [columns, generateDescription, onOCR, generateFileTags, extractFileDetails, onChange, onLocalRecordChange, updateFileTags, updateDescription]);

  const getItems = useMemo(() => {
    if (!canModifyRecord || !record || checkIsDir(record)) return [];
    const descriptionColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION);
    const fileName = getFileNameFromRecord(record);
    const isImage = Utils.imageCheck(fileName);
    const isVideo = Utils.videoCheck(fileName);
    const isPdf = Utils.pdfCheck(fileName);
    const isDescribableDoc = Utils.isDescriptionSupportedFile(fileName);
    let list = [];

    if (descriptionColumn && isDescribableDoc) {
      list.push({
        key: OPERATION.GENERATE_DESCRIPTION,
        label: gettext('Generate description'),
        opData: { type: OPERATION.GENERATE_DESCRIPTION, record }
      });
    }

    if (isImage || isPdf) {
      list.push({ key: OPERATION.OCR, label: gettext('Extract text'), opData: { type: OPERATION.OCR, record } });
    }

    if (isImage || isVideo) {
      list.push({ key: OPERATION.FILE_DETAIL, label: gettext('Extract file detail'), opData: { type: OPERATION.FILE_DETAIL, record } });
    }

    if (enableTags && isDescribableDoc && !isVideo) {
      list.push({ key: OPERATION.FILE_TAGS, label: gettext('Generate file tags'), opData: { type: OPERATION.FILE_TAGS, record } });
    }

    return list.map(item => ({ ...item, onClick: () => handleOperation(item) }));
  }, [canModifyRecord, record, columns, enableTags, handleOperation]);

  if (!enableMetadata || !canModifyRecord || !record) return null;

  return (
    <CustomDropdown
      target="ai-icon"
      items={getItems}
      trigger={(
        <>
          <Icon symbol="ai" className="detail-control-icon" />
          <Tooltip target="ai-icon">{gettext('AI')}</Tooltip>
        </>
      )}
      triggerClassName="border-0 p-0 bg-transparent detail-control mr-2"
      menuClassName="sf-metadata-ai-dropdown-menu large"
      forwardedRef={forwardedRef}
      toggleProps={{ 'aria-label': gettext('AI') }}
    />
  );
};

export default AIIcon;

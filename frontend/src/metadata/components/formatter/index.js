import React from 'react';
import PropTypes from 'prop-types';
import TextFormatter from '../cell-formatter/text';
import CreatorFormatter from '../cell-formatter/creator';
import CTimeFormatter from '../cell-formatter/ctime';
import DateFormatter from '../cell-formatter/date';
import SingleSelectFormatter from '../cell-formatter/single-select';
import CollaboratorsFormatter from '../cell-formatter/collaborators';
import CheckboxFormatter from '../cell-formatter/checkbox';
import GeolocationFormatter from '../cell-formatter/geolocation';
import LongTextFormatter from '../cell-formatter/long-text';
import NumberFormatter from '../cell-formatter/number';
import MultipleSelectFormatter from '../cell-formatter/multiple-select';
import RateFormatter from '../cell-formatter/rate';
import FileNameFormatter from '../cell-formatter/file-name';
import FileTagsFormatter from '../cell-formatter/file-tags';
import Empty from './empty';
import { CellType } from '../../constants';

import './index.css';

const Formatter = ({ field, value, isSample, queryUserAPI, emptyTip, tagsData, ...params }) => {
  const { type: fieldType } = field || {};
  const className = `sf-metadata-${fieldType}-formatter`;
  switch (fieldType) {
    case CellType.TEXT: {
      return (
        <TextFormatter value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </TextFormatter>
      );
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return (
        <CTimeFormatter value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </CTimeFormatter>
      );
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      return (
        <CreatorFormatter value={value} className={className} api={queryUserAPI} {...params}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </CreatorFormatter>
      );
    }
    case CellType.FILE_NAME: {
      return (
        <FileNameFormatter value={value} className={className} {...params}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </FileNameFormatter>
      );
    }
    case CellType.DATE: {
      return (
        <DateFormatter value={value} format={field.data?.format} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </DateFormatter>
      );
    }
    case CellType.SINGLE_SELECT: {
      return (
        <SingleSelectFormatter value={value} options={field.data?.options || []} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </SingleSelectFormatter>
      );
    }
    case CellType.MULTIPLE_SELECT: {
      return (
        <MultipleSelectFormatter value={value} options={field.data?.options || []} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </MultipleSelectFormatter>
      );
    }
    case CellType.COLLABORATOR: {
      return (
        <CollaboratorsFormatter value={value} className={className} api={queryUserAPI} {...params}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </CollaboratorsFormatter>
      );
    }
    case CellType.CHECKBOX: {
      return (
        <CheckboxFormatter value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </CheckboxFormatter>
      );
    }
    case CellType.GEOLOCATION: {
      return (
        <GeolocationFormatter {...params} format={field.data?.geo_format} value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </GeolocationFormatter>
      );
    }
    case CellType.LONG_TEXT: {
      return (
        <LongTextFormatter {...params} value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </LongTextFormatter>
      );
    }
    case CellType.NUMBER: {
      return (
        <NumberFormatter value={value} formats={field?.data} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </NumberFormatter>
      );
    }
    case CellType.RATE: {
      return (
        <RateFormatter value={value} data={field?.data} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </RateFormatter>
      );
    }
    case CellType.TAGS: {
      return (
        <FileTagsFormatter value={value} tagsData={tagsData} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </FileTagsFormatter>
      );
    }
    default: {
      return (
        <TextFormatter value={value} className={className}>
          <Empty fieldType={fieldType} placeholder={emptyTip} />
        </TextFormatter>
      );
    }
  }
};

Formatter.propTypes = {
  isSample: PropTypes.bool,
  field: PropTypes.object.isRequired,
  value: PropTypes.any,
  tagsData: PropTypes.object,
  record: PropTypes.object,
};

export default Formatter;

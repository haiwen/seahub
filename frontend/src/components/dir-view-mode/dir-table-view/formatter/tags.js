import React from 'react';
import FileTagsFormatter from '@/metadata/components/cell-formatter/file-tags';
import { useTags } from '@/tag/hooks';

const TagsFormatterWrapper = ({ record, column, value, className, ...otherProps }) => {
  const { tagsData } = useTags();
  return (
    <FileTagsFormatter tagsData={tagsData} value={value} showName={true} className={className} />
  );
};

export default TagsFormatterWrapper;

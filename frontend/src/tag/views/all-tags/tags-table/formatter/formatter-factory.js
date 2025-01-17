import React from 'react';
import ParentTagsFormatter from './parent-tags';
import TagNameFormatter from './tag-name';
import ChildTagsFormatter from './child-tags';
import TagFilesFormatter from './tag-files';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

export const createColumnFormatter = ({ column, otherProps }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.TAG_NAME: {
      const { setDisplayTag } = otherProps;
      return <TagNameFormatter setDisplayTag={setDisplayTag} />;
    }
    case PRIVATE_COLUMN_KEY.PARENT_LINKS: {
      return <ParentTagsFormatter />;
    }
    case PRIVATE_COLUMN_KEY.SUB_LINKS: {
      return <ChildTagsFormatter />;
    }
    case PRIVATE_COLUMN_KEY.TAG_FILE_LINKS: {
      return <TagFilesFormatter />;
    }
    default: {
      return null;
    }
  }
};

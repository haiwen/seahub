import React from 'react';
import ParentTagsEditor from './parent-tags';
import ChildTagsEditor from './child-tags';
import TagNameEditor from './tag-name';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

export const createColumnEditor = ({ column, otherProps }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.TAG_NAME: {
      const { updateTag, addTagLinks, deleteTagLinks } = otherProps;
      return <TagNameEditor updateTag={updateTag} addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} />;
    }
    case PRIVATE_COLUMN_KEY.PARENT_LINKS: {
      const { addTagLinks, deleteTagLinks } = otherProps;
      return <ParentTagsEditor addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} />;
    }
    case PRIVATE_COLUMN_KEY.SUB_LINKS: {
      const { addTagLinks, deleteTagLinks } = otherProps;
      return <ChildTagsEditor addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} />;
    }
    default: {
      return null;
    }
  }
};

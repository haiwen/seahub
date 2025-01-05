import ParentTagsEditor from './parent-tags';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';
import TagNameEditor from './tag-name';
import SubTagsEditor from './sub-tags';

export const createColumnEditor = ({ column, otherProps }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.TAG_NAME: {
      const { updateTag } = otherProps;
      return <TagNameEditor updateTag={updateTag} />;
    }
    case PRIVATE_COLUMN_KEY.PARENT_LINKS: {
      const { addTagLinks, deleteTagLinks } = otherProps;
      return <ParentTagsEditor addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} />;
    }
    case PRIVATE_COLUMN_KEY.SUB_LINKS: {
      const { addTagLinks, deleteTagLinks } = otherProps;
      return <SubTagsEditor addTagLinks={addTagLinks} deleteTagLinks={deleteTagLinks} />;
    }
    default: {
      return null;
    }
  }
};

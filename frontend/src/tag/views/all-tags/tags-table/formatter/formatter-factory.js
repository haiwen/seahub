import ParentTagsFormatter from './parent-tags';
import TagNameFormatter from './tag-name';
import SubTagsFormatter from './sub-tags';
import TagFilesFormatter from './tag-files';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

export const createColumnFormatter = ({ column }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.TAG_NAME: {
      return <TagNameFormatter />;
    }
    case PRIVATE_COLUMN_KEY.PARENT_LINKS: {
      return <ParentTagsFormatter />;
    }
    case PRIVATE_COLUMN_KEY.SUB_LINKS: {
      return <SubTagsFormatter />;
    }
    case PRIVATE_COLUMN_KEY.TAG_FILE_LINKS: {
      return <TagFilesFormatter />;
    }
    default: {
      return null;
    }
  }
};

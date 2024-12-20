import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import EmptyTip from '../../../../components/empty-tip';
import Tags from './tags';
import { gettext } from '../../../../utils/constants';

const LinkedTags = ({ isParentTags, linkedTags, switchToAddTagsPage, deleteLinedTag }) => {

  return (
    <div className="sf-metadata-set-linked-tags-popover-selected">
      <div className="sf-metadata-set-linked-tags-popover-header">
        <div className="sf-metadata-set-linked-tags-popover-title">
          {isParentTags ? gettext('Parent tags') : gettext('Sub tags')}
        </div>
        <Button size="sm" color="primary" className="mr-2" onClick={switchToAddTagsPage}>{gettext('Link existing tags')}</Button>
      </div>
      <div className="sf-metadata-set-linked-tags-popover-body">
        {linkedTags.length === 0 && (
          <EmptyTip text={gettext(isParentTags ? 'No parent tag' : 'No sub tag')} />
        )}
        {linkedTags.length > 0 && (
          <Tags deletable tags={linkedTags} deleteTag={deleteLinedTag} />
        )}
      </div>
    </div>
  );
};

LinkedTags.propTypes = {
  isParentTags: PropTypes.bool,
  linkedTags: PropTypes.array,
  switchToAddTagsPage: PropTypes.func,
  deleteTag: PropTypes.func,
};

export default LinkedTags;

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { Button } from 'reactstrap';
import { useTags } from '../../hooks';
import Main from './main';
import { gettext } from '../../../utils/constants';
import EditTagDialog from '../../components/dialog/edit-tag-dialog';

import './index.css';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';

const TagsManagement = () => {
  const [isShowEditTagDialog, setShowEditTagDialog] = useState(false);

  const { isLoading, tagsData, addTag, context } = useTags();

  useEffect(() => {
    const eventBus = context.eventBus;
    eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  const openAddTag = useCallback(() => {
    setShowEditTagDialog(true);
  }, []);

  const closeAddTag = useCallback(() => {
    setShowEditTagDialog(false);
  }, []);

  const handelAddTags = useCallback((tag, callback) => {
    addTag(tag, callback);
  }, [addTag]);

  if (isLoading) return (<CenteredLoading />);
  return (
    <>
      <div className="ssf-metadata-tags-wrapper">
        <div className="sf-metadata-tags-main">
          <div className="sf-metadata-tags-management-container">
            <div className="sf-metadata-container-header">
              <div className="sf-metadata-container-header-title">{gettext('Tags management')}</div>
              <div className="sf-metadata-container-header-actions">
                {context.canAddTag() && (
                  <Button color="primary" className="sf-metadata-container-header-add-tag" onClick={openAddTag}>
                    {gettext('Add Tag')}
                  </Button>
                )}
              </div>
            </div>
            <Main tags={tags} context={context} />
          </div>
        </div>
      </div>
      {isShowEditTagDialog && (
        <EditTagDialog tags={tags} title={gettext('Add tag')} onToggle={closeAddTag} onSubmit={handelAddTags} />
      )}
    </>
  );
};

export default TagsManagement;

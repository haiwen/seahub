import React, { useEffect, useState, useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import TagsTable from './tags-table';
import TagFiles from './tag-files';
import { useTags } from '../../hooks';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../../metadata/constants';
import { Utils } from '../../../utils/utils';

import './index.css';

const AllTags = ({ ...params }) => {
  const [displayTag, setDisplayTag] = useState('');
  const [isLoadingMore, setLoadingMore] = useState(false);

  const { isLoading, isReloading, tagsData, store, context } = useTags();

  useEffect(() => {
    const eventBus = context.eventBus;
    eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeDisplayTag = useCallback((tagID = '') => {
    if (displayTag === tagID) return;
    setDisplayTag(tagID);
  }, [displayTag]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    if (!tagsData.hasMore) return;
    setLoadingMore(true);

    try {
      await store.loadMore(PER_LOAD_NUMBER);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }

  }, [isLoadingMore, tagsData, store]);

  if (isLoading || isReloading) return (<CenteredLoading />);

  if (displayTag) {
    return (<TagFiles { ...params } tagID={displayTag} onChangeDisplayTag={onChangeDisplayTag} />);
  }

  return (
    <div className="sf-metadata-tags-wrapper sf-metadata-all-tags-wrapper">
      <TagsTable
        context={context}
        tagsData={tagsData}
        modifyColumnWidth={store.modifyColumnWidth}
        setDisplayTag={onChangeDisplayTag}
        isLoadingMoreRecords={isLoadingMore}
        loadMore={loadMore}
      />
    </div>
  );
};

export default AllTags;

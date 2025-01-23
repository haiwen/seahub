import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import TagsTable from './tags-table';
import View from '../view';
import { TagViewProvider, useTags } from '../../hooks';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../../metadata/constants';
import { Utils } from '../../../utils/utils';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { getRowById } from '../../../components/sf-table/utils/table';
import { getTagName } from '../../utils/cell';
import { ALL_TAGS_ID } from '../../constants';

import './index.css';

const AllTags = ({ updateCurrentPath, ...params }) => {
  const [displayTag, setDisplayTag] = useState('');
  const [isLoadingMore, setLoadingMore] = useState(false);

  const tagsTableWrapperRef = useRef(null);

  const { isLoading, isReloading, tagsData, store, context, currentPath, modifyColumnWidth } = useTags();

  const displayNodeKey = useRef('');

  useEffect(() => {
    const eventBus = context.eventBus;
    eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentPath) return;
    if (!currentPath.includes('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/')) return;
    const pathList = currentPath.split('/');
    const [, , currentTagId, children] = pathList;
    if (currentTagId === ALL_TAGS_ID && !children) {
      setDisplayTag();
    }
  }, [currentPath]);

  const onChangeDisplayTag = useCallback((tagID = '', nodeKey = '') => {
    if (displayTag === tagID) return;

    const tag = tagID && getRowById(tagsData, tagID);
    let path = `/${PRIVATE_FILE_TYPE.TAGS_PROPERTIES}/${ALL_TAGS_ID}`;
    if (tag) {
      path += `/${getTagName(tag)}`;
    }

    displayNodeKey.current = nodeKey || '';
    updateCurrentPath(path);

    setDisplayTag(tagID);
  }, [tagsData, displayTag, updateCurrentPath]);

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

  useEffect(() => {
    if (isLoading || isReloading) {
      onChangeDisplayTag();
    }
  }, [isLoading, isReloading, onChangeDisplayTag]);

  const getTagsTableWrapperOffsets = useCallback(() => {
    if (!tagsTableWrapperRef.current) return {};
    return tagsTableWrapperRef.current.getBoundingClientRect();
  }, []);

  if (isReloading) return (<CenteredLoading />);

  if (displayTag) {
    return (
      <div className="sf-metadata-all-tags-tag-files">
        <TagViewProvider { ...params } tagID={displayTag} nodeKey={displayNodeKey.current} updateCurrentPath={updateCurrentPath} >
          <View />
        </TagViewProvider>
      </div>
    );
  }

  return (
    <div className="sf-metadata-tags-wrapper sf-metadata-all-tags-wrapper" ref={tagsTableWrapperRef}>
      <TagsTable
        context={context}
        tagsData={tagsData}
        modifyColumnWidth={modifyColumnWidth}
        setDisplayTag={onChangeDisplayTag}
        isLoadingMoreRecords={isLoadingMore}
        loadMore={loadMore}
        getTagsTableWrapperOffsets={getTagsTableWrapperOffsets}
      />
    </div>
  );
};

export default AllTags;

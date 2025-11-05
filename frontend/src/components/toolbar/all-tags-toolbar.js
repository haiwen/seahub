import React, { useCallback, useEffect, useState } from 'react';
import { gettext } from '../../utils/constants';
import ItemDropdownMenu from '../dropdown-menu/metadata-item-dropdown-menu';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import EventBus from '../common/event-bus';
import OpElement from '../../components/op-element';
import OpIcon from '../../components/op-icon';

const AllTagsToolbar = () => {
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const canDelete = window.sfTagsDataContext && window.sfTagsDataContext.checkCanDeleteTag();
  const canModify = window.sfTagsDataContext && window.sfTagsDataContext.canModify();
  const eventBus = EventBus.getInstance();

  const unSelect = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const deleteTags = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DELETE_TAGS, selectedTagIds);
  }, [selectedTagIds, eventBus]);

  const getMenuList = useCallback(() => {
    if (!canModify) return [];
    const { MERGE_TAGS, NEW_CHILD_TAG } = TextTranslation;
    const list = [];
    if (selectedTagIds.length > 1) {
      list.push(MERGE_TAGS);
      return list;
    }
    list.push(NEW_CHILD_TAG);
    return list;
  }, [selectedTagIds, canModify]);

  const onMenuItemClick = useCallback((operation, e) => {
    switch (operation) {
      case TextTranslation.MERGE_TAGS.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MERGE_TAGS, selectedTagIds, { left: e.clientX, top: e.clientY });
        break;
      }
      case TextTranslation.NEW_CHILD_TAG.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.NEW_SUB_TAG, selectedTagIds[0]);
        break;
      }
    }
  }, [eventBus, selectedTagIds]);

  useEffect(() => {
    const unsubscribeSelectTags = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_TAGS, (ids) => {
      setSelectedTagIds(ids);
    });

    return () => {
      unsubscribeSelectTags && unsubscribeSelectTags();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const length = selectedTagIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <OpElement
        className="cur-view-path-btn px-2"
        title={gettext('Unselect')}
        op={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2"></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </OpElement>
      {canDelete &&
        <OpIcon
          className="cur-view-path-btn sf3-font-delete1 sf3-font"
          title={gettext('Delete')}
          op={deleteTags}
        />
      }
      {length > 0 && (
        <ItemDropdownMenu
          item={{}}
          toggleClass={'cur-view-path-btn sf3-font-more sf3-font'}
          onMenuItemClick={onMenuItemClick}
          getMenuList={getMenuList}
        />
      )}
    </div>
  );
};

export default AllTagsToolbar;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import EventBus from '../common/event-bus';
import OpElement from '../../components/op-element';
import OpIcon from '../../components/op-icon';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

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

  const menuItems = useMemo(() => {
    if (!canModify) {
      return [];
    }

    if (selectedTagIds.length > 1) {
      return [{
        key: TextTranslation.MERGE_TAGS.key,
        label: TextTranslation.MERGE_TAGS.value,
        onClick: (e) => onMenuItemClick(TextTranslation.MERGE_TAGS.key, e),
      }];
    }

    return [{
      key: TextTranslation.NEW_CHILD_TAG.key,
      label: TextTranslation.NEW_CHILD_TAG.value,
      onClick: (e) => onMenuItemClick(TextTranslation.NEW_CHILD_TAG.key, e),
    }];
  }, [canModify, onMenuItemClick, selectedTagIds.length]);

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
        op={unSelect}
      >
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="close" />
        </span>
        <span>{length}{' '}{gettext('selected')}</span>
      </OpElement>
      {canDelete &&
        <OpIcon
          id="delete-btn"
          className="cur-view-path-btn"
          symbol="delete1"
          tooltip={gettext('Delete')}
          op={deleteTags}
        />
      }
      {length > 0 && (
        <CustomDropdown
          target="all-tags-more-operations-btn"
          items={menuItems}
          triggerClassName="cur-view-path-btn"
        />
      )}
    </div>
  );
};

export default AllTagsToolbar;

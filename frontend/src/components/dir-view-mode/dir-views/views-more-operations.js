import React, { useCallback } from 'react';
import TextTranslation from '../../../utils/text-translation';
import { baiduMapKey, gettext, googleMapKey } from '@/utils/constants';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE, VIEW_TYPE, VIEW_TYPE_ICON, VIEW_TYPE_LABEL } from '../../../metadata/constants';
import Icon from '../../icon';
import Tooltip from '@/components/tooltip';
import CustomDropdown from '../../dropdown';

export const ADD_VIEW_KEY = {
  ADD_FOLDER: 'ADD_FOLDER',
  ADD_TABLE: 'ADD_TABLE',
  ADD_GALLERY: 'ADD_GALLERY',
  ADD_KANBAN: 'ADD_KANBAN',
  ADD_MAP: 'ADD_MAP',
  ADD_CARD: 'ADD_CARD',
  ADD_STATISTICS: 'ADD_STATISTICS',
};

export const ADD_VIEW_OPTIONS = [
  { key: ADD_VIEW_KEY.ADD_TABLE, type: VIEW_TYPE.TABLE },
  { key: ADD_VIEW_KEY.ADD_GALLERY, type: VIEW_TYPE.GALLERY },
  { key: ADD_VIEW_KEY.ADD_KANBAN, type: VIEW_TYPE.KANBAN },
  { key: ADD_VIEW_KEY.ADD_CARD, type: VIEW_TYPE.CARD },
  { key: ADD_VIEW_KEY.ADD_STATISTICS, type: VIEW_TYPE.STATISTICS },
];

const ViewsMoreOperations = ({ menuProps }) => {
  const eventBus = EventBus.getInstance();

  const addView = useCallback((viewType) => {
    eventBus.dispatch(EVENT_BUS_TYPE.ADD_VIEW, { viewType });
  }, [eventBus]);

  const clickMenu = useCallback((option) => {
    switch (option) {
      case ADD_VIEW_KEY.ADD_FOLDER: {
        eventBus.dispatch(EVENT_BUS_TYPE.ADD_FOLDER);
        return;
      }
      case ADD_VIEW_KEY.ADD_TABLE: {
        addView(VIEW_TYPE.TABLE);
        return;
      }
      case ADD_VIEW_KEY.ADD_GALLERY: {
        addView(VIEW_TYPE.GALLERY);
        return;
      }
      case ADD_VIEW_KEY.ADD_KANBAN: {
        addView(VIEW_TYPE.KANBAN);
        return;
      }
      case ADD_VIEW_KEY.ADD_MAP: {
        addView(VIEW_TYPE.MAP);
        return;
      }
      case ADD_VIEW_KEY.ADD_CARD: {
        addView(VIEW_TYPE.CARD);
        return;
      }
      case ADD_VIEW_KEY.ADD_STATISTICS: {
        addView(VIEW_TYPE.STATISTICS);
        return;
      }
      default: {
        return;
      }
    }
  }, [addView, eventBus]);

  const getNewViewSubMenu = useCallback(() => {
    const options = ADD_VIEW_OPTIONS.map(({ key, type }) => ({ key, type }));
    const hasMapOption = options.some((option) => option.type === VIEW_TYPE.MAP);

    if (!hasMapOption && (baiduMapKey || googleMapKey)) {
      options.push({ key: ADD_VIEW_KEY.ADD_MAP, type: VIEW_TYPE.MAP });
    }

    return options.map(({ key, type }) => {
      if (key === 'Divider') return key;
      return {
        key,
        label: VIEW_TYPE_LABEL[type],
        icon_dom: <Icon symbol={VIEW_TYPE_ICON[type] || VIEW_TYPE.TABLE} className="metadata-view-icon" />,
        onClick: () => clickMenu(key),
      };
    });
  }, [clickMenu]);

  const getMoreOperationsMenus = useCallback(() => {
    return [
      {
        key: ADD_VIEW_KEY.ADD_FOLDER,
        label: TextTranslation.ADD_FOLDER.value,
        icon_dom: <Icon symbol="folder" className="metadata-view-icon" />,
        onClick: () => clickMenu(ADD_VIEW_KEY.ADD_FOLDER),
      },
      'Divider',
      ...getNewViewSubMenu(),
    ];
  }, [clickMenu, getNewViewSubMenu]);

  const renderCustomTrigger = useCallback((isOpen) => {
    return (
      <>
        <Icon symbol="new" />
        {!isOpen && <Tooltip target={target}>{gettext('New view')}</Tooltip>}
      </>
    );
  }, []);

  const target = 'new-view-btn';
  return (
    <div className="tree-section-header-operation tree-section-more-operation">
      <CustomDropdown
        {...menuProps}
        target={target}
        items={getMoreOperationsMenus()}
        menuClassName="metadata-views-dropdown-menu"
        onItemClick={(selectedItem) => clickMenu(selectedItem.key)}
        trigger={renderCustomTrigger}
      />
    </div>
  );
};

export default ViewsMoreOperations;

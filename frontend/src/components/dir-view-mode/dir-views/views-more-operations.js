import React, { useCallback } from 'react';
import ItemDropdownMenu from '../../dropdown-menu/item-dropdown-menu';
import TextTranslation from '../../../utils/text-translation';
import { isMobile } from '../../../utils/utils';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE, VIEW_TYPE } from '../../../metadata/constants';
import { getNewViewSubMenu, KEY_ADD_VIEW_MAP } from './new-view-menu';
import Icon from '../../icon';

const ViewsMoreOperations = ({ menuProps }) => {
  const eventBus = EventBus.getInstance();

  const addView = (viewType) => {
    eventBus.dispatch(EVENT_BUS_TYPE.ADD_VIEW, { viewType });
  };

  const clickMenu = (option) => {
    switch (option) {
      case TextTranslation.ADD_FOLDER.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.ADD_FOLDER);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_TABLE: {
        addView(VIEW_TYPE.TABLE);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_GALLERY: {
        addView(VIEW_TYPE.GALLERY);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_KANBAN: {
        addView(VIEW_TYPE.KANBAN);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_MAP: {
        addView(VIEW_TYPE.MAP);
        return;
      }
      default: {
        return;
      }
    }
  };

  const getMoreOperationsMenus = useCallback(() => {
    return [
      {
        key: KEY_ADD_VIEW_MAP.ADD_FOLDER,
        value: TextTranslation.ADD_FOLDER.value,
        icon_dom: <Icon symbol="folder" className="metadata-view-icon" />
      },
      'Divider',
      ...getNewViewSubMenu(),
    ];
  }, []);

  return (
    <div className="tree-section-header-operation tree-section-more-operation">
      <ItemDropdownMenu
        {...menuProps}
        item={{ name: 'views' }}
        menuClassname="metadata-views-dropdown-menu"
        toggleClass="sf3-font sf3-font-new"
        menuStyle={isMobile ? { zIndex: 1050 } : {}}
        getMenuList={getMoreOperationsMenus}
        onMenuItemClick={clickMenu}
      />
    </div>
  );
};

export default ViewsMoreOperations;

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ItemDropdownMenu from '../../../../../components/dropdown-menu/item-dropdown-menu';
import { gettext } from '../../../../../utils/constants';
import { isMobile } from '../../../../../utils/utils';

const KEY_MORE_OPERATION = {
  SET_PARENT_TAGS: 'set_parent_tags',
  SET_SUB_TAGS: 'set_sub_tags',
};

const TagMoreOperation = ({ freezeItem, unfreezeItem, showParentTagsSetter, showSubTagsSetter }) => {

  const operationMenus = useMemo(() => {
    let menus = [];
    menus.push(
      { key: KEY_MORE_OPERATION.SET_PARENT_TAGS, value: gettext('Set parent tags') },
      { key: KEY_MORE_OPERATION.SET_SUB_TAGS, value: gettext('Set sub tags') },
    );
    return menus;
  }, []);

  const clickMenu = useCallback((key) => {
    switch (key) {
      case KEY_MORE_OPERATION.SET_PARENT_TAGS: {
        showParentTagsSetter();
        return;
      }
      case KEY_MORE_OPERATION.SET_SUB_TAGS: {
        showSubTagsSetter();
        return;
      }
      default: {
        return;
      }
    }
  }, [showParentTagsSetter, showSubTagsSetter]);

  return (
    <div className="sf-metadata-tags-table-cell-action mr-2" title={gettext('More')}>
      <ItemDropdownMenu
        item={{ name: 'metadata-tag' }}
        menuClassname="metadata-tag-dropdown-menu"
        toggleClass="sf3-font sf3-font-more"
        freezeItem={freezeItem}
        unfreezeItem={unfreezeItem}
        getMenuList={() => operationMenus}
        onMenuItemClick={clickMenu}
        menuStyle={isMobile ? { zIndex: 1050 } : {}}
      />
    </div>
  );
};

TagMoreOperation.propTypes = {
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
  showParentTagsSetter: PropTypes.func,
  showSubTagsSetter: PropTypes.func,
};

export default TagMoreOperation;

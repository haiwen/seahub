import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { CommonlyUsedHotkey, getValidGroupbys } from '../../_basic';
import { gettext } from '../../utils';
import { GroupbysPopover } from '../popover';

const GroupbySetter = ({ columns, groupbys: propsGroupbys, wrapperClass, target, modifyGroupbys }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const groupbys = useMemo(() => {
    return getValidGroupbys(propsGroupbys, columns) || [];
  }, [columns, propsGroupbys]);

  const message = useMemo(() => {
    const groupbysLength = groupbys ? groupbys.length : 0;
    if (groupbysLength === 1) return gettext('Grouped by 1 column');
    if (groupbysLength > 1) return gettext('Grouped by xxx columns').replace('xxx', groupbysLength);
    // need to translate to Group
    return gettext('Group_by');
  }, [groupbys]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(event) || CommonlyUsedHotkey.isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const onChange = useCallback((groupbys) => {
    const validGroupbys = getValidGroupbys(groupbys, columns);
    modifyGroupbys(validGroupbys);
  }, [columns, modifyGroupbys]);

  const className = classnames(wrapperClass, { 'active': groupbys.length > 0 });
  return (
    <>
      <IconBtn
        iconName="group"
        size={24}
        className={className}
        onClick={onSetterToggle}
        role="button"
        onKeyDown={onKeyDown}
        title={message}
        aria-label={message}
        tabIndex={0}
        id={target}
      />
      {isShowSetter && (
        <GroupbysPopover
          groupbys={groupbys}
          target={target}
          placement="bottom-end"
          columns={columns}
          hidePopover={onSetterToggle}
          onChange={onChange}
        />
      )}
    </>
  );

};

GroupbySetter.defaultProps = {
  target: 'sf-metadata-groupby-popover',
  isNeedSubmit: false,
};

GroupbySetter.propTypes = {
  wrapperClass: PropTypes.string,
  columns: PropTypes.array,
  groupbys: PropTypes.array, // valid groupbys
  modifyGroupbys: PropTypes.func,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
};

export default GroupbySetter;

import React, { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { getValidSorts, CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';
import { SortPopover } from '../popover';

const SortSetter = ({ target, sorts: propsSorts, columns, isNeedSubmit, wrapperClass, modifySorts }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const sorts = useMemo(() => {
    return getValidSorts(propsSorts || [], columns);
  }, [propsSorts, columns]);

  const sortMessage = useMemo(() => {
    const sortsLength = sorts.length;
    if (sortsLength === 1) return isNeedSubmit ? gettext('1 preset sort') : gettext('1 sort');
    if (sortsLength > 1) return sortsLength + ' ' + (isNeedSubmit ? gettext('preset sorts') : gettext('sorts'));
    return isNeedSubmit ? gettext('Preset sort') : gettext('Sort');
  }, [isNeedSubmit, sorts]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(event) || CommonlyUsedHotkey.isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const onChange = useCallback((update) => {
    const { sorts } = update || {};
    modifySorts(sorts);
  }, [modifySorts]);

  if (!columns) return null;
  const className = classnames(wrapperClass, { 'active': sorts.length > 0 });
  return (
    <>
      <div className={classnames('setting-item', { 'mb-1': !className })}>
        <div
          className={classnames('mr-2 setting-item-btn filters-setting-btn', className)}
          onClick={onSetterToggle}
          role="button"
          onKeyDown={onKeyDown}
          title={sortMessage}
          aria-label={sortMessage}
          tabIndex={0}
          id={target}
        >
          <Icon iconName="sort" />
          <span>{sortMessage}</span>
        </div>
      </div>
      {isShowSetter && (
        <SortPopover
          isNeedSubmit={isNeedSubmit}
          target={target}
          columns={columns}
          sorts={sorts}
          onSortComponentToggle={onSetterToggle}
          update={onChange}
        />
      )}
    </>
  );

};


const propTypes = {
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  isNeedSubmit: PropTypes.bool,
  sorts: PropTypes.array,
  columns: PropTypes.array,
  modifySorts: PropTypes.func,
};

SortSetter.propTypes = propTypes;

SortSetter.defaultProps = {
  target: 'sf-metadata-sort-popover',
  isNeedSubmit: false,
};

export default SortSetter;

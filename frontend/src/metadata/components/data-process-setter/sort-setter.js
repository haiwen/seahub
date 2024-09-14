import React, { useCallback, useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { SortPopover } from '../popover';
import { gettext } from '../../../utils/constants';
import { getValidSorts } from '../../utils/sort';
import { EVENT_BUS_TYPE } from '../../constants';
import { isEnter, isSpace } from '../../utils/hotkey';

const SortSetter = ({ target, type, sorts: propsSorts, readOnly, columns, isNeedSubmit, wrapperClass, modifySorts }) => {
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

  const displaySetter = useCallback(() => {
    setShowSetter(true);
  }, []);

  useEffect(() => {
    const eventBus = window.sfMetadataContext.eventBus;
    const unsubscribeDisplaySorts = eventBus.subscribe(EVENT_BUS_TYPE.DISPLAY_SORTS, displaySetter);
    return () => {
      unsubscribeDisplaySorts();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (isEnter(event) || isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const onChange = useCallback((update) => {
    const { sorts } = update || {};
    modifySorts(sorts);
  }, [modifySorts]);

  if (!columns) return null;
  const className = classnames(wrapperClass, { 'active': sorts.length > 0 });
  return (
    <>
      <IconBtn
        iconName="sort"
        size={24}
        className={className}
        onClick={onSetterToggle}
        role="button"
        onKeyDown={onKeyDown}
        title={sortMessage}
        aria-label={sortMessage}
        tabIndex={0}
        id={target}
      />
      {isShowSetter && (
        <SortPopover
          isNeedSubmit={isNeedSubmit}
          readOnly={readOnly}
          type={type}
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
  isNeedSubmit: PropTypes.bool,
  readOnly: PropTypes.bool,
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  type: PropTypes.string,
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

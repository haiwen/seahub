import React, { useCallback, useState, useMemo, useEffect } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import OpIcon from '@/components/op-icon';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { EVENT_BUS_TYPE } from '../../constants';
import { getValidSorts } from '../../utils/sort';
import { SortPopover } from '../popover';

const SortSetter = ({ target = 'sf-metadata-sort-popover', type, sorts: propsSorts, readOnly, columns, wrapperClass, modifySorts }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const sorts = useMemo(() => {
    return getValidSorts(propsSorts || [], columns);
  }, [propsSorts, columns]);

  const sortMessage = useMemo(() => {
    const sortsLength = sorts.length;
    if (sortsLength === 1) return gettext('1 sort');
    if (sortsLength > 1) return sortsLength + ' ' + gettext('sorts');
    return gettext('Sort');
  }, [sorts]);

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

  const onChange = useCallback((update) => {
    const { sorts } = update || {};
    modifySorts(sorts);
  }, [modifySorts]);

  if (!columns) return null;

  return (
    <>
      <OpIcon id={target} symbol="sort" className={classnames(wrapperClass, { 'active': sorts.length > 0 })} tooltip={sortMessage} aria-label={sortMessage} disableTooltip={isShowSetter} op={onSetterToggle} onKeyDown={Utils.onKeyDown} />
      {isShowSetter && (
        <SortPopover
          readOnly={readOnly}
          type={type}
          target={target}
          columns={columns}
          sorts={sorts}
          hidePopover={onSetterToggle}
          update={onChange}
        />
      )}
    </>
  );
};


const propTypes = {
  readOnly: PropTypes.bool,
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  type: PropTypes.string,
  sorts: PropTypes.array,
  columns: PropTypes.array,
  modifySorts: PropTypes.func,
};

SortSetter.propTypes = propTypes;

export default SortSetter;

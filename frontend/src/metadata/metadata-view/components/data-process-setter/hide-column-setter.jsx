import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { CommonlyUsedHotkey } from '../../_basic';
import { gettext } from '../../utils';


const HideColumnSetter = ({ columns, wrapperClass, target, localShownColumnKeys }) => {
  const [isShowSetter, setShowSetter] = useState(false);

  const hiddenColumns = useMemo(() => {
    return columns.filter((column) => !localShownColumnKeys.includes(column.key));
  }, [columns, localShownColumnKeys]);

  const message = useMemo(() => {
    const hiddenColumnsLength = hiddenColumns.length;
    if (hiddenColumnsLength === 1) return gettext('1 hidden column');
    if (hiddenColumnsLength > 1) return gettext('xxx hidden columns').replace('xxx', hiddenColumnsLength);
    return gettext('Hide columns');
  }, [hiddenColumns]);

  const onSetterToggle = useCallback(() => {
    setShowSetter(!isShowSetter);
  }, [isShowSetter]);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (CommonlyUsedHotkey.isEnter(event) || CommonlyUsedHotkey.isSpace(event)) onSetterToggle();
  }, [onSetterToggle]);

  const className = classnames(wrapperClass, { 'active': hiddenColumns.length > 0 });
  return (
    <>
      <IconBtn
        iconName="hide"
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
    </>
  );
};

HideColumnSetter.propTypes = {
  wrapperClass: PropTypes.string,
  target: PropTypes.string,
  page: PropTypes.object,
  shownColumnKeys: PropTypes.array,
  localShownColumnKeys: PropTypes.array,
  columns: PropTypes.array,
  modifyHiddenColumns: PropTypes.func,
};

export default HideColumnSetter;

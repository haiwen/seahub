import React, { useCallback, useRef, useEffect } from 'react';
import isHotkey from 'is-hotkey';
import { Button, UncontrolledPopover } from 'reactstrap';
import { getEventClassName } from '@/utils/dom';
import { gettext } from '../../../utils/constants';

import './comment-delete-popover.css';

const CommentDeletePopover = ({ type, setIsShowDeletePopover, deleteConfirm, targetId, parentDom = document.body }) => {

  const popoverRef = useRef(null);

  const hide = useCallback((event) => {
    if (popoverRef.current && !getEventClassName(event).includes('popover') && !popoverRef.current.contains(event.target)) {
      setIsShowDeletePopover(false);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [setIsShowDeletePopover]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event)) {
      event.preventDefault();
      setIsShowDeletePopover(false);
    }
  }, [setIsShowDeletePopover]);

  useEffect(() => {
    document.addEventListener('click', hide, true);
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('click', hide, true);
      document.removeEventListener('keydown', onHotKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDeleteCancel = useCallback((event) => {
    event.stopPropagation();
    setIsShowDeletePopover(false);
  }, [setIsShowDeletePopover]);

  const handleConfirm = useCallback((event) => {
    event.stopPropagation();
    deleteConfirm();
  }, [deleteConfirm]);

  return (
    <UncontrolledPopover
      container={parentDom}
      target={targetId}
      onClick={event => event.stopPropagation()}
      placement="left"
      className='comment-delete-popover'
      isOpen={true}
    >
      <div className='comment-delete-popover-container' ref={popoverRef}>
        <div className='delete-tip'>
          {type === 'comment' ? gettext('Are you sure to delete this comment?') : gettext('Are you sure to delete this reply?')}
        </div>
        <div className='delete-control mt-5'>
          <Button color='secondary' size='sm' className='mr-2' onClick={onDeleteCancel}>{gettext('Cancel')}</Button>
          <Button color='primary' size='sm' onClick={handleConfirm}>{gettext('Confirm')}</Button>
        </div>
      </div>
    </UncontrolledPopover>
  );
};

export default CommentDeletePopover;

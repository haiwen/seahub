import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import SearchInput from '../../../components/search-input';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import RepoListItem from './repo-list-item';
import { getEventClassName } from '../../../utils/dom';
import isHotkey from 'is-hotkey';

import './index.css';
import Icon from '../../../components/icon';

export default function RepoListPopover({ placement, target, repoOptions, linkedRepos, onAddLinkedRepo, onHidePopover }) {

  const popoverRef = useRef(null);
  const [searchValue, setSearchValue] = useState('');

  const currentOptions = useMemo(() => {
    const existIdsMap = linkedRepos.reduce((idMap, item) => {
      idMap[item.id] = true;
      return idMap;
    }, {});
    let repoList = repoOptions.filter(item => !existIdsMap[item.id]);
    if (searchValue) {
      repoList = repoList.filter(item => item.name.indexOf(searchValue) > -1);
    }
    return repoList;
  }, [linkedRepos, repoOptions, searchValue]);

  const onPopoverInsideClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onKeyDown = useCallback((event) => {
    if (
      event.keyCode === KeyCodes.ChineseInputMethod ||
      event.keyCode === KeyCodes.Enter ||
      event.keyCode === KeyCodes.LeftArrow ||
      event.keyCode === KeyCodes.RightArrow
    ) {
      event.stopPropagation();
    }
  }, []);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onItemClick = useCallback((item) => {
    onAddLinkedRepo(item);
  }, [onAddLinkedRepo]);

  const hide = useCallback((event) => {
    if (popoverRef.current && !getEventClassName(event).includes('popover') && !popoverRef.current.contains(event.target)) {
      onHidePopover(event);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [onHidePopover]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event)) {
      event.preventDefault();
      onHidePopover();
    }
  }, [onHidePopover]);

  useEffect(() => {
    document.addEventListener('click', hide, true);
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('click', hide, true);
      document.removeEventListener('keydown', onHotKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UncontrolledPopover
      placement={placement}
      isOpen={true}
      target={target}
      fade={false}
      hideArrow={true}
      className="repo-list-popover-wrapper"
      popperClassName="repo-list-popover"
      boundariesElement={document.body}
    >
      <div ref={popoverRef} onClick={onPopoverInsideClick} className="repo-list-popover-content" style={{ maxHeight: window.innerHeight - 100 }}>
        <div className="repo-list-popover__search">
          <span className="search-icon-left input-icon-addon"><Icon symbol="search" /></span>
          <SearchInput placeholder={gettext('Search libraries')} onKeyDown={onKeyDown} onChange={onChangeSearch} autoFocus={true}/>
        </div>
        <div className='repo-list-popover__list'>
          {currentOptions.map(item => {
            return <RepoListItem key={item.id} item={item} onItemClick={onItemClick} />;
          })}
        </div>
      </div>
    </UncontrolledPopover>
  );
}

import React, { useEffect, useId } from 'react';
import { Input, Popover } from 'reactstrap';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import OpIcon from '@/components/op-icon';
import UserItem from '@/components/user-item';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

const optionType = PropTypes.shape({
  key: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  avatarUrl: PropTypes.string,
  secondaryText: PropTypes.string,
  data: PropTypes.any,
});

function PositionObserver({ update, onPopoverUpdate }) {
  useEffect(() => {
    if (!onPopoverUpdate) return;
    onPopoverUpdate(update);
    return () => onPopoverUpdate(null);
  }, [update, onPopoverUpdate]);
  return null;
}

PositionObserver.propTypes = {
  update: PropTypes.func,
  onPopoverUpdate: PropTypes.func,
};

function UserSelectPopover({
  target, isOpen, onToggle, width = 300, offset = [0, 4], trigger = 'click',
  options = [], selectedOptions = [], query = '', onQueryChange, onClear,
  searchPlaceholder, autoFocus, isLoading = false, emptyText, highlightIndex = -1,
  onSelect, onRemove, renderSearchInput, inputRef, listRef, optionRef, panelRef, onPopoverUpdate,
}) {
  const instanceId = `user-select-popover-${useId().replace(/:/g, '')}`;
  const selectedKeys = new Set(selectedOptions.map(option => option.key));
  const notify = (callback, option, event) => {
    event.stopPropagation();
    if (callback) callback(option, event);
  };
  // SearchInput may hold uncommitted composition/debounced text. It owns when to show
  // this indicator, while the shared popover owns the button's markup and styling.
  const renderClearButton = (clearValue = onClear) => (
    <OpIcon
      id={`${instanceId}-clear`}
      className="user-select-popover__clear"
      symbol="close"
      tooltip={gettext('Clear')}
      op={event => {
        event.stopPropagation();
        if (clearValue) clearValue(event);
      }}
    />
  );
  const renderUser = option => ({ name: option.name, avatar_url: option.avatarUrl || '' });

  return (
    <Popover
      target={target}
      isOpen={isOpen}
      toggle={onToggle}
      placement="bottom-start"
      hideArrow={true}
      fade={false}
      trigger={trigger}
      offset={offset}
      popperClassName="user-select-popover"
      innerClassName="user-select-popover__inner"
      style={{ width, maxWidth: 'calc(100vw - 16px)' }}
    >
      {({ update }) => (
        <div className="user-select-popover__content" ref={panelRef} onMouseDown={event => event.stopPropagation()}>
          <PositionObserver update={update} onPopoverUpdate={onPopoverUpdate} />
          <div className="user-select-popover__selected">
            {selectedOptions.map((option, index) => (
              <UserItem
                key={option.key}
                className="user-select-popover__tag"
                user={renderUser(option)}
                secondaryText={null}
                removeButtonId={`${instanceId}-remove-${index}`}
                onDeleteUser={(user, event) => notify(onRemove, option, event)}
              />
            ))}
          </div>
          <div className="user-select-popover__search">
            {renderSearchInput ? renderSearchInput({
              className: 'user-select-popover__input',
              renderClearButton,
            }) : (
              <>
                <Input
                  className="user-select-popover__input"
                  innerRef={inputRef}
                  value={query}
                  onChange={event => onQueryChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  autoFocus={autoFocus}
                />
                {query && renderClearButton()}
              </>
            )}
          </div>
          {isLoading ? (
            <div className="user-select-popover__empty" role="status">{gettext('Loading...')}</div>
          ) : options.length === 0 ? (
            <div className="user-select-popover__empty" role="status">{emptyText}</div>
          ) : (
            <div className="user-select-popover__list" role="listbox" ref={listRef}>
              {options.map((option, index) => (
                <div
                  key={option.key}
                  className={classnames('user-select-popover__option', {
                    'user-select-popover__option--highlighted': index === highlightIndex,
                  })}
                  ref={optionRef ? ref => optionRef(ref, index) : undefined}
                  onClick={event => notify(onSelect, option, event)}
                  onKeyDown={Utils.onKeyDown}
                  tabIndex={0}
                  role="option"
                  aria-selected={selectedKeys.has(option.key)}
                >
                  <UserItem
                    className="user-select-popover__user"
                    user={renderUser(option)}
                    secondaryText={option.secondaryText == null ? null : option.secondaryText}
                    enableDeleteUser={false}
                  />
                  {selectedKeys.has(option.key) && <Icon symbol="check" className="user-select-popover__check" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

UserSelectPopover.propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.func]).isRequired,
  isOpen: PropTypes.bool,
  onToggle: PropTypes.func,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  offset: PropTypes.array,
  trigger: PropTypes.string,
  options: PropTypes.arrayOf(optionType),
  selectedOptions: PropTypes.arrayOf(optionType),
  query: PropTypes.string,
  onQueryChange: PropTypes.func,
  onClear: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  autoFocus: PropTypes.bool,
  isLoading: PropTypes.bool,
  emptyText: PropTypes.string,
  highlightIndex: PropTypes.number,
  onSelect: PropTypes.func,
  onRemove: PropTypes.func,
  renderSearchInput: PropTypes.func,
  inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  listRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  optionRef: PropTypes.func,
  panelRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onPopoverUpdate: PropTypes.func,
};

export default UserSelectPopover;

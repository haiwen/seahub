import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Form, Input, UncontrolledPopover } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils';
import '../index.css';

const Rename = ({ value, target, toggle, onSubmit }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit(inputValue);
  }, [inputValue, onSubmit]);

  useEffect(() => {
    const handleClickOutSide = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        toggle(event);
      }
    };

    if (inputRef.current) {
      inputRef.current.select();
      document.addEventListener('mousedown', handleClickOutSide);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutSide);
    };
  }, [toggle]);

  return (
    <UncontrolledPopover
      className='sf-metadata-rename-view-popover'
      isOpen={true}
      toggle={toggle}
      target={target}
      placement='right-start'
      hideArrow={true}
      fade={false}
      boundariesElement={document.body}
    >
      <div className='sf-metadata-rename-view-popover-header'>
        {gettext('Rename view')}
      </div>
      <div className="seafile-divider dropdown-divider"></div>
      <div className='sf-metadata-rename-view-popover-body'>
        <Form onSubmit={handleSubmit}>
          <Input
            innerRef={inputRef}
            className='sf-metadata-view-input'
            type='text'
            id="rename-input"
            name='rename'
            value={inputValue}
            onChange={onChange}
            autoFocus={true}
          />
        </Form>
      </div>
    </UncontrolledPopover>
  );
};

Rename.propTypes = {
  value: PropTypes.string,
  target: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default Rename;

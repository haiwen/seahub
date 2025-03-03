import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react';
import { FormGroup, FormFeedback, Label, Dropdown, DropdownToggle } from 'reactstrap';
import Icon from '@/components/icon';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../../../utils/constants';
import CustomDropdownMenu from '../custom-dropdown-menu';

import './index.css';

const Type = forwardRef(({ column, onChange }, ref) => {
  const [error, setError] = useState('');
  const [isPredefinedPropertiesOpen, setPredefinedPropertiesOpen] = useState(false);
  const [isCustomPropertiesOpen, setCustomPropertiesOpen] = useState(false);
  const inputRef = useRef(null);

  const togglePredefinedProperties = useCallback((e) => {
    e?.stopPropagation();
    setPredefinedPropertiesOpen(prev => !prev);
  }, []);

  useImperativeHandle(ref, () => ({
    setError: (error) => setError(error),
    getIsPopoverShow: () => isPredefinedPropertiesOpen || isCustomPropertiesOpen,
    setPopoverState: (state) => {
      if (state) {
        inputRef.current.focus();
      } else {
        setPredefinedPropertiesOpen(false);
        setCustomPropertiesOpen(false);
      }
    },
  }), [isPredefinedPropertiesOpen, isCustomPropertiesOpen]);

  useEffect(() => {
    setError('');
  }, []);

  return (
    <>
      <FormGroup className={classnames('sf-metadata-column-settings-item', { 'is-invalid': error })}>
        <Label>{gettext('Type')}</Label>
        <Dropdown
          isOpen={isPredefinedPropertiesOpen}
          direction="start"
          toggle={togglePredefinedProperties}
          className={classnames('sf-metadata-column-type', { 'sf-metadata-column-type-focus': isPredefinedPropertiesOpen })}
        >
          <DropdownToggle
            tag="span"
            className="sf-metadata-column-type-info"
          >
            <Icon symbol={column.icon} className="sf-metadata-icon mr-2" />
            <span className="mr-auto">{column.name}</span>
            <i className="sf3-font sf3-font-down" aria-hidden="true"></i>
          </DropdownToggle>
          <CustomDropdownMenu
            column={column}
            modifiers={[{
              name: 'offset',
              options: {
                offset: [0, 17],
              }
            }]}
            onSelect={onChange}
          />
        </Dropdown>
        {error && (<FormFeedback>{error}</FormFeedback>)}
      </FormGroup>
    </>
  );
});

Type.propTypes = {
  parentWidth: PropTypes.number,
  column: PropTypes.object,
  onChange: PropTypes.func,
};

export default Type;

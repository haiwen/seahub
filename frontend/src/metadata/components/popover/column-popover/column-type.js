import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react';
import { FormGroup, FormFeedback, Label, Dropdown, DropdownToggle } from 'reactstrap';
import Icon from '@/components/icon';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../../utils/constants';
import CustomDropdownMenu from './dropdown-menu';
import ModalPortal from '../../../../components/modal-portal';

const ColumnType = forwardRef(({ column, onChange }, ref) => {
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
            <Icon symbol="down" />
          </DropdownToggle>
          <ModalPortal>
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
          </ModalPortal>
        </Dropdown>
        {error && (<FormFeedback>{error}</FormFeedback>)}
      </FormGroup>
    </>
  );
});

ColumnType.propTypes = {
  parentWidth: PropTypes.number,
  column: PropTypes.object,
  onChange: PropTypes.func,
};

export default ColumnType;

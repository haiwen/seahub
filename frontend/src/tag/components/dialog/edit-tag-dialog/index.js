import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, FormGroup, Input, Button, Alert, Label } from 'reactstrap';
import classnames from 'classnames';
import IconBtn from '../../../../components/icon-btn';
import toaster from '../../../../components/toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../../../utils/constants';
import { getTagColor, getTagId, getTagName } from '../../../utils/cell';
import { isValidTagName } from '../../../utils/validate/tag';
import { SELECT_OPTION_COLORS } from '../../../../metadata/constants';
import { isEnter } from '../../../../utils/hotkey';
import { PRIVATE_COLUMN_KEY } from '../../../constants';

import './index.css';

const EditTagDialog = ({ tags, tag, title, onSubmit, onToggle }) => {
  const [name, setName] = useState(getTagName(tag));
  const [color, setColor] = useState(getTagColor(tag) || SELECT_OPTION_COLORS[0].COLOR);
  const [errMessage, setErrorMessage] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const otherTagsName = useMemo(() => {
    const tagId = getTagId(tag);
    return tags.filter(tagItem => getTagId(tagItem) !== tagId).map(tagItem => getTagName(tagItem));
  }, [tags, tag]);

  const handleSubmit = useCallback(() => {
    setSubmitting(true);
    const { isValid, message } = isValidTagName(name, otherTagsName);
    if (!isValid) {
      setErrorMessage(message);
      setSubmitting(false);
      return;
    }
    if (color === getTagColor(tag) && name === getTagName(tag)) {
      onToggle();
      return;
    }
    onSubmit({ [PRIVATE_COLUMN_KEY.TAG_COLOR]: color, [PRIVATE_COLUMN_KEY.TAG_NAME]: name }, {
      success_callback: () => {
        onToggle();
      },
      fail_callback: (error) => {
        toaster.danger(error);
        setSubmitting(false);
      }
    });
  }, [tag, name, color, otherTagsName, onToggle, onSubmit]);

  const handleKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (isEnter(event)) {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((event) => {
    const newValue = event.target.value;
    if (newValue === name) return;
    setName(newValue);
  }, [name]);

  const handelColorChange = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const newColor = event.target.value;
    if (newColor === color) return;
    setColor(newColor);
  }, [color]);

  return (
    <Modal isOpen={true} toggle={onToggle} autoFocus={false} className="sf-metadata-tags-edit-dialog">
      <SeahubModalHeader toggle={onToggle}>{title}</SeahubModalHeader>
      <ModalBody>
        <FormGroup className="mb-0">
          <Label for="tagColor">{gettext('Color')}</Label>
          <div className="row gutters-xs" onClick={(e) => e && e.stopPropagation()}>
            {SELECT_OPTION_COLORS.map((colorItem, index) => {
              const { COLOR: optionColor, BORDER_COLOR: borderColor, TEXT_COLOR: textColor } = colorItem;
              const isSelected = (index === 0 && !color) || color === optionColor;
              return (
                <div key={colorItem.COLOR} className="col-auto">
                  <label className="color-select">
                    <input name="color" type="radio" value={optionColor} className="sf-metadata-edit-tag-color-input" defaultChecked={isSelected} onClick={handelColorChange} onKeyDown={handleKeyDown} />
                    <IconBtn
                      className={classnames('sf-metadata-edit-tag-color-container', { 'selected': isSelected })}
                      style={{ backgroundColor: optionColor || null, borderColor: borderColor }}
                      symbol="check-mark"
                      iconStyle={{ fill: textColor || '#666' }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </FormGroup>
        <FormGroup className="mb-0">
          <Label for="tagName">{gettext('Name')}</Label>
          <Input
            id="tagName"
            value={name}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            autoFocus={true}
          />
        </FormGroup>
        {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
        <Button color="primary" onClick={handleSubmit} disabled={!name || isSubmitting}>{gettext('Submit')}</Button>
      </ModalFooter>
    </Modal>
  );
};

EditTagDialog.propTypes = {
  tags: PropTypes.array,
  tag: PropTypes.object,
  title: PropTypes.string,
  onSubmit: PropTypes.func,
  onToggle: PropTypes.func,
};

export default EditTagDialog;

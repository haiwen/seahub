import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from 'reactstrap';
import classnames from 'classnames';
import { Transition } from 'react-transition-group';
import FieldItem from './field-item';
import { gettext } from '@/utils/constants';

import './index.css';

const FIELD_ITEM_HEIGHT = 30;
const BANNER_HEIGHT = 24;
const DURATION = 300;

const FieldDisplaySettings = ({ fieldIconConfig, fields, textProperties, onToggleField, onMoveField, onToggleFieldsVisibility }) => {
  const nodeRef = useRef(null);
  const [isCollapsed, setCollapsed] = useState(true);

  const expandAllFields = () => {
    setCollapsed(!isCollapsed);
  };

  const defaultStyle = {
    transition: `all ${DURATION}ms cubic-bezier(.645,.045,.355,1)`,
    opacity: 0,
  };
  const transitionStyles = {
    entering: { opacity: 1, height: `${fields.length * FIELD_ITEM_HEIGHT + BANNER_HEIGHT}px` },
    entered: { opacity: 1, height: `${fields.length * FIELD_ITEM_HEIGHT + BANNER_HEIGHT}px` },
    exiting: { opacity: 0, height: 0 },
    exited: { opacity: 0, height: 0 },
  };
  const fieldAllShown = fields.every(field => field.shown);

  return (
    <div className="sf-metadata-field-display-setting">
      <div
        className="sf-metadata-field-display-setting-header d-flex align-items-center justify-content-between"
        onClick={expandAllFields}
        role="button"
        aria-label={isCollapsed ? gettext('Expand') : gettext('Collapse')}
      >
        <Label className="mb-0">{textProperties.titleValue}</Label>
        <div className="sf-metadata-field-display-toggle-btn">
          <i aria-hidden="true" className={classnames('sf3-font sf3-font-down', { 'rotate-270': isCollapsed })}></i>
        </div>
      </div>
      <Transition nodeRef={nodeRef} in={!isCollapsed} timeout={DURATION}>
        {state => (
          <div className="sf-metadata-field-display-setting-wrapper" ref={nodeRef} style={{ ...defaultStyle, ...transitionStyles[state] }}>
            <div className={`sf-metadata-field-display-setting-banner ${isCollapsed ? 'd-none' : 'd-flex'} align-items-center justify-content-between h-5 mt-2 mb-2`}>
              <Label className="mb-0">{textProperties.bannerValue}</Label>
              <span className="show-all-button" onClick={() => onToggleFieldsVisibility(!fieldAllShown)}>
                {fieldAllShown ? textProperties.hideValue : textProperties.showValue}
              </span>
            </div>
            <div className="sf-metadata-field-display-setting-body">
              {fields.map((field, index) => {
                return (
                  <FieldItem
                    key={`${field.key}-${index}`}
                    field={field}
                    fieldIconConfig={fieldIconConfig}
                    isCollapsed={isCollapsed}
                    onToggleField={onToggleField}
                    onMoveField={onMoveField}
                  />
                );
              })}
            </div>
          </div>
        )}
      </Transition>
    </div>
  );
};

FieldDisplaySettings.propTypes = {
  fieldIconConfig: PropTypes.object,
  fields: PropTypes.array.isRequired,
  textProperties: PropTypes.shape({
    titleValue: PropTypes.string.isRequired,
    bannerValue: PropTypes.string.isRequired,
    hideValue: PropTypes.string.isRequired,
    showValue: PropTypes.string.isRequired,
  }),
  onToggleField: PropTypes.func.isRequired,
  onMoveField: PropTypes.func.isRequired,
  onToggleFieldsVisibility: PropTypes.func.isRequired,
};

export default FieldDisplaySettings;

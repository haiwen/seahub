import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip, Col } from 'reactstrap';
import { IconBtn, Icon } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG } from '../../../../_basic';

import './index.css';

const FieldLabel = ({ field }) => {
  const { type, name, description, key } = field;
  const iconRef = useRef(null);
  return (
    <Col md={3} className="d-flex sf-metadata-record-details-item-label">
      <div className="d-flex justify-content-between">
        <div className="field-description-section">
          <span className="header-icon" id={`header-icon-${key}`}>
            <Icon iconName={COLUMNS_ICON_CONFIG[type]} />
          </span>
          <span className="field-description-section-field-name">{name || ''}</span>
          {description &&
            <>
              <IconBtn ref={iconRef} iconName="description" className="field-uneditable-tip ml-2" />
              {iconRef.current && (
                <UncontrolledTooltip target={iconRef.current} fade={false} placement="right" modifiers={{ preventOverflow: { boundariesElement: document.body } }}>
                  {description}
                </UncontrolledTooltip>
              )}
            </>
          }
        </div>
      </div>
    </Col>
  );

};

FieldLabel.propTypes = {
  field: PropTypes.object,
  fieldIconConfig: PropTypes.object,
};

export default FieldLabel;

import { useState, useCallback } from 'react';
import { FormGroup, Label } from 'reactstrap';
import classnames from 'classnames';
import Icon from '@/components/icon';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { gettext } from '../../../../../../utils/constants';
import { formatDetailsJSONValue, formatDetailsValue, shouldHighlightDetailsAsJSON } from '../tool-details-content';

import './index.css';

const hasOwnProperty = (obj, propertyKey) => {
  if (!obj || !propertyKey) return false;
  return Object.prototype.hasOwnProperty.call(obj, propertyKey);
};

const getType = (value) => {
  return Object.prototype.toString.call(value).slice(8, -1);
};

const ProcessDetails = ({ value }) => {
  const [isShowDetails, setIsShowDetails] = useState(false);

  const toggle = useCallback(() => {
    setIsShowDetails(!isShowDetails);
  }, [isShowDetails]);

  if (!value) return null;

  const valueType = getType(value);

  if (valueType === 'String') {
    return (
      <Label className="sea-ai-thought-process-content-title">{value}</Label>
    );
  }

  if (valueType !== 'Object') return null;

  const hasChildren = hasOwnProperty(value, 'children');
  const hasName = hasOwnProperty(value, 'name');

  if (hasChildren) {
    const { isPrimaryContainer, name, icon, defaultShowDetails } = value;
    const orderClassName = classnames('sea-ai-thought-process-order', { 'primary-order-container': isPrimaryContainer, 'has-content': isShowDetails });
    const contentKey = `sea-ai-thought-process-content-${value.id}`;
    const contentClassName = classnames('sea-ai-thought-process-content', { 'primary-content-container': isPrimaryContainer }, contentKey);
    const handleToggleClick = (event) => {
      event.stopPropagation();
      toggle();
    };

    return (
      <>
        <div className={orderClassName} onClick={toggle}>
          {!isPrimaryContainer && (
            <button
              type="button"
              className={classnames('seaqa-icon-btn no-hover-bg', { 'rotate-icon-180': isShowDetails })}
              aria-label={gettext('Toggle details')}
              onClick={handleToggleClick}
            >
              <Icon symbol="arrow-down" className="seaqa-icon-svg" />
            </button>
          )}
          <span className="sea-ai-thought-process-order-title">
            {isPrimaryContainer && <Icon symbol={icon} className="seaqa-icon-svg" />}
            <span>{name}</span>
          </span>
          {isPrimaryContainer && (
            <button
              type="button"
              className={classnames('seaqa-icon-btn no-hover-bg', { 'rotate-icon-180': isShowDetails })}
              aria-label={gettext('Toggle details')}
              onClick={handleToggleClick}
            >
              <Icon symbol="arrow-down" className="seaqa-icon-svg" />
            </button>
          )}
        </div>

        {(isShowDetails || defaultShowDetails) && (
          <div className={contentClassName}>
            {value.children.map((child, childIndex) => (
              <ProcessDetails
                value={child}
                key={childIndex}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  const formattedValue = shouldHighlightDetailsAsJSON(value.key)
    ? formatDetailsJSONValue(value.value)
    : formatDetailsValue(value.value);

  if (value.name === 'Result') {
    return (
      <FormGroup className="sea-ai-thought-process-content-item">
        {hasName && (<Label className="sea-ai-thought-process-content-title">{value.name}</Label>)}
        <MarkdownViewer value={formattedValue} isShowOutline={false} />
      </FormGroup>
    );
  }

  return (
    <FormGroup className="sea-ai-thought-process-content-item">
      {hasName && (<Label className="sea-ai-thought-process-content-title">{value.name}</Label>)}
      <div className="sea-ai-thought-process-content-value">
        {(formattedValue || formattedValue === 0) ? formattedValue : (
          <span className="seaqa-tip-default">{gettext('Empty')}</span>
        )}
      </div>
    </FormGroup>
  );
};

export default ProcessDetails;

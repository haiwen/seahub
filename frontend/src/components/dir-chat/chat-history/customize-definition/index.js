import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Definition from './definition';
import MoreDefinition from './more-definition';

import './index.css';

const CustomizeDefinition = ({ element, sources, ...props }) => {
  const isValid = useMemo(() => {
    if (!element) return false;
    if (!Array.isArray(sources) || sources.length === 0) return false;
    return true;
  }, [element, sources]);
  const identifier = useMemo(() => isValid ? Number(element.identifier) : -1, [element, isValid]);

  if (!isValid) return null;

  if (sources.length < 4) {
    return <Definition element={element} sources={sources} {...props} />;
  }

  if (identifier < 4) {
    return <Definition element={element} sources={sources} {...props} />;
  }

  if (identifier === 4) {
    return (
      <>
        <MoreDefinition sources={sources} {...props} />
        <div data-id={element.id} {...props?.attributes} className="sea-ai-chat-customize-definition-hidden"></div>
      </>
    );
  }

  return <div data-id={element.id} {...props?.attributes} className="sea-ai-chat-customize-definition-hidden"></div>;
};

CustomizeDefinition.propTypes = {
  element: PropTypes.object,
  sources: PropTypes.array,
};

export default CustomizeDefinition;

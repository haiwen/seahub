import React from 'react';
import PropTypes from 'prop-types';

import './index.css';

const CustomizeLinkReference = ({ element, onClick, attributes }) => {
  return (
    <span
      onClick={onClick}
      className="sea-ai-chat-customize-link-reference cursor-pointer d-inline-block"
      data-id={element.id}
      {...attributes}
      title={element.label}
    >
      {element.identifier}
    </span>
  );
};

CustomizeLinkReference.propTypes = {
  element: PropTypes.object,
  onClick: PropTypes.func,
  attributes: PropTypes.object,
};

export default CustomizeLinkReference;

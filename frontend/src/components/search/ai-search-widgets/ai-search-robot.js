import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../utils/constants';

function AISearchRobot({style}) {
  return (
    <div style={style}>
      <img src={`${mediaUrl}img/ask-ai.png`} alt="" width="32" height="32" />
    </div>
  );
}

AISearchRobot.propTypes = {
  style: PropTypes.object,
};

export default AISearchRobot;

import React from 'react';
import ProtoTypes from 'prop-types';

const CustomIcon = ({ icon }) => {
  return (
    <span className='nav-item-icon nav-item-icon-disable'>{icon}</span>
  );
};

CustomIcon.propTypes = {
  icon: ProtoTypes.string.isRequired,
};

export default CustomIcon;

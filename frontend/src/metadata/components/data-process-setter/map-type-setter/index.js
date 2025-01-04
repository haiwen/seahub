import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { EVENT_BUS_TYPE, MAP_TYPE } from '../../../constants';
import { gettext } from '../../../../utils/constants';

import './index.css';

const TYPE_MAP = {
  [MAP_TYPE.MAP]: gettext('Map'),
  [MAP_TYPE.SATELLITE]: gettext('Satellite')
};

const MapTypeSetter = ({ view }) => {
  const [currentType, setCurrentType] = useState(MAP_TYPE.MAP);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('map-type', MAP_TYPE.MAP);
    setCurrentType(savedValue || MAP_TYPE.MAP);
  }, [view?._id]);

  const handleTypeChange = useCallback((newType) => {
    setCurrentType(newType);
    window.sfMetadataContext.localStorage.setItem('map-type', newType);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_MAP_TYPE, newType);
  }, []);

  return (
    <div className="metadata-map-type-setter">
      {Object.entries(TYPE_MAP).map(([type, label]) => (
        <button
          key={type}
          className={classnames('metadata-map-type-button', { active: currentType === type })}
          onClick={() => handleTypeChange(type)}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

MapTypeSetter.propTypes = {
  view: PropTypes.shape({
    _id: PropTypes.string
  })
};

export default MapTypeSetter;

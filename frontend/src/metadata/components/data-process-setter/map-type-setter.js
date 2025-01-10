import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE, MAP_TYPE, STORAGE_MAP_TYPE_KEY } from '../../constants';
import { gettext } from '../../../utils/constants';
import RadioGroup from '../radio-group';

const MAP_TYPES = [
  { value: MAP_TYPE.MAP, label: gettext('Map') },
  { value: MAP_TYPE.SATELLITE, label: gettext('Satellite') },
];

const MapTypeSetter = ({ view }) => {
  const [currentType, setCurrentType] = useState(MAP_TYPE.MAP);

  useEffect(() => {
    const type = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_TYPE_KEY) || MAP_TYPE.MAP;
    setCurrentType(type);
  }, [view?._id]);

  const onChange = useCallback((type) => {
    if (currentType === type) return;
    setCurrentType(type);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_MAP_TYPE, type);
  }, [currentType]);

  return (<RadioGroup options={MAP_TYPES} value={currentType} onChange={onChange} />);
};

MapTypeSetter.propTypes = {
  view: PropTypes.shape({
    _id: PropTypes.string
  })
};

export default MapTypeSetter;

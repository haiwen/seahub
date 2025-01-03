import React, { useEffect } from 'react';
import { isModS } from '../../metadata/utils/hotkey';

const HotkeySave = ({ onSave }) => {

  useEffect(() => {
    const handleHotkeySave = (event) => {
      if (isModS(event)) {
        event.preventDefault();
        onSave();
      }
    };

    document.addEventListener('keydown', handleHotkeySave);
    return () => {
      document.removeEventListener('keydown', handleHotkeySave);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSave]);

  return null;
};

export default HotkeySave;

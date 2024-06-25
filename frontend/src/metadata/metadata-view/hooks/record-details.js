/* eslint-disable react/prop-types */
import React, { useContext, useState, useCallback } from 'react';

const RecordDetailsContext = React.createContext(null);

export const RecordDetailsProvider = ({ children }) => {
  const [isShowRecordDetails, setIsShowRecordDetails] = useState(false);
  const [recordDetails, setRecordDetails] = useState({});

  const openRecordDetails = useCallback((recordDetails) => {
    setRecordDetails(recordDetails);
    setIsShowRecordDetails(true);
  }, []);

  const closeRecordDetails = useCallback(() => {
    setRecordDetails({});
    setIsShowRecordDetails(false);
  }, []);

  return (
    <RecordDetailsContext.Provider value={{ isShowRecordDetails, recordDetails, openRecordDetails, closeRecordDetails }}>
      {children}
    </RecordDetailsContext.Provider>
  );
};

export const useRecordDetails = () => {
  const context = useContext(RecordDetailsContext);
  if (!context) {
    throw new Error('\'RecordDetailsContext\' is null');
  }
  const { isShowRecordDetails, recordDetails, openRecordDetails, closeRecordDetails } = context;
  return { isShowRecordDetails, recordDetails, openRecordDetails, closeRecordDetails };
};

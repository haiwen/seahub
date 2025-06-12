import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import FileAccessLog from '../../components/dialog/file-access-log';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about access log
const AccessLogContext = React.createContext(null);

export const AccessLogProvider = forwardRef(({ repoID, eventBus, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const pathRef = useRef('');
  const nameRef = useRef('');

  const handleAccessLog = useCallback((path, name) => {
    pathRef.current = path;
    nameRef.current = name;
    setDialogShow(true);
  }, []);

  const cancelAccessLog = useCallback(() => {
    setDialogShow(false);
    pathRef.current = '';
    nameRef.current = '';
  }, []);

  useEffect(() => {
    const unsubscribeCreateFile = eventBus.subscribe(EVENT_BUS_TYPE.ACCESS_LOG, handleAccessLog);
    return () => {
      unsubscribeCreateFile();
    };
  }, [eventBus, handleAccessLog]);

  useImperativeHandle(ref, () => ({
    handleAccessLog,
    cancelAccessLog,
  }), [handleAccessLog, cancelAccessLog]);

  return (
    <AccessLogContext.Provider value={{ eventBus, handleAccessLog }}>
      {children}
      {isDialogShow && (
        <ModalPortal>
          <FileAccessLog
            repoID={repoID}
            filePath={pathRef.current}
            fileName={nameRef.current}
            toggleDialog={cancelAccessLog}
          />
        </ModalPortal>
      )}
    </AccessLogContext.Provider>
  );
});

export const useAccessLogContext = () => {
  const context = useContext(AccessLogContext);
  if (!context) {
    throw new Error('\'AccessLogContext\' is null');
  }
  return context;
};


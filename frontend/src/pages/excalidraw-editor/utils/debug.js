/* eslint-disable no-console */
import Debug from 'debug';

const stateDebug = Debug('excalidraw:state-change');
stateDebug.enabled = true;
stateDebug.log = console.log;

const clientDebug = Debug('excalidraw:socket-client');
clientDebug.enabled = true;
clientDebug.log = console.log;

const serverDebug = Debug('excalidraw:socket-server');
serverDebug.enabled = true;
serverDebug.log = console.log;

const conflictDebug = Debug('excalidraw:sdoc-conflict');
conflictDebug.enabled = true;
conflictDebug.log = console.log;

export {
  stateDebug,
  clientDebug,
  serverDebug,
  conflictDebug,
};

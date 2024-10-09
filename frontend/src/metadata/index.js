import SeafileMetadata, { Context as MetadataContext } from './metadata-view';
import MetadataStatusManagementDialog from './components/dialog/metadata-status-manage-dialog';
import MetadataFaceRecognitionDialog from './components/dialog/metadata-face-recognition-dialog';
import MetadataDetails from './components/metadata-details';
import MetadataTreeView from './metadata-tree-view';
import metadataAPI from './api';

export * from './hooks';

export {
  metadataAPI,
  MetadataContext,
  SeafileMetadata,
  MetadataStatusManagementDialog,
  MetadataFaceRecognitionDialog,
  MetadataTreeView,
  MetadataDetails,
};

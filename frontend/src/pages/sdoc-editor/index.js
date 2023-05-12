import React, { Fragment } from 'react';
import { SimpleEditor } from '@seafile/sdoc-editor';
import ExternalOperations from './external-operations';

export default class SdocEditor extends React.Component {
  render() {
    const { repoID, docPath } = window.seafile;
    return (
      <Fragment>
        <SimpleEditor />
        <ExternalOperations repoID={repoID} docPath={docPath} />
      </Fragment>
    );
  }
}

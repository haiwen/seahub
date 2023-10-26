import React, { Fragment } from 'react';
import { SimpleEditor } from '@seafile/sdoc-editor';
import ExternalOperations from './external-operations';

export default class SdocEditor extends React.Component {

  constructor(props) {
    super(props);
    const { isStarred, isSdocDraft } = window.app.pageOptions;
    this.state = {
      isStarred: isStarred,
      isDraft: isSdocDraft
    };
  }

  toggleStar = (isStarred) => {
    this.setState({isStarred: isStarred});
  };

  unmarkDraft = () => {
    this.setState({isDraft: false});
  };

  render() {
    const { repoID, docPath, docName, docPerm } = window.seafile;
    const { isStarred, isDraft } = this.state;
    return (
      <Fragment>
        <SimpleEditor isStarred={isStarred} isDraft={isDraft} />
        <ExternalOperations
          repoID={repoID}
          docPath={docPath}
          docName={docName}
          docPerm={docPerm}
          isStarred={isStarred}
          toggleStar={this.toggleStar}
          unmarkDraft={this.unmarkDraft}
        />
      </Fragment>
    );
  }
}

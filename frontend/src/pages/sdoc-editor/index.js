import React, { Fragment } from 'react';
import { SimpleEditor } from '@seafile/sdoc-editor';
import ExternalOperations from './external-operations';

export default class SdocEditor extends React.Component {

  constructor(props) {
    super(props);
    const { isStarred } = window.app.pageOptions;
    this.state = {
      isStarred: isStarred
    };
  }

  toggleStar = (isStarred) => {
    this.setState({isStarred: isStarred});
  }

  render() {
    const { repoID, docPath } = window.seafile;
    const { isStarred } = this.state;
    return (
      <Fragment>
        <SimpleEditor isStarred={isStarred} />
        <ExternalOperations
          repoID={repoID}
          docPath={docPath}
          isStarred={isStarred}
          toggleStar={this.toggleStar}
        />
      </Fragment>
    );
  }
}

import React, { Fragment } from 'react';
import GeneralToolBar from './toolbar/general-toolbar';

const MainContentWrapper = (WrapperedComponent) => {
  return class Wrapper extends React.Component {

    constructor(props) {
      super(props);
    }

    render() {
      return (
        <Fragment>
          <GeneralToolBar {...this.props} />
          <WrapperedComponent {...this.props} />
        </Fragment>
      );
    }
  };
};

export default MainContentWrapper;

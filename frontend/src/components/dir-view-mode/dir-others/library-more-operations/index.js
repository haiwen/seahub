import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MyLibraryMoreOperations from './my-library-more-operations';
import DepartmentLibraryMoreOperations from './department-library-more-operations';

const propTypes = {
  repo: PropTypes.object.isRequired,
  updateRepoInfo: PropTypes.func.isRequired
};

class LibraryMoreOperations extends React.Component {

  render() {
    const { repo } = this.props;
    const { owner_email } = repo;
    const isDepartmentRepo = owner_email.indexOf('@seafile_group') != -1;
    return (
      <>
        {isDepartmentRepo
          ? <DepartmentLibraryMoreOperations {...this.props} />
          : <MyLibraryMoreOperations {...this.props} />
        }
      </>
    );
  }
}

LibraryMoreOperations.propTypes = propTypes;

export default LibraryMoreOperations;

import React, { Component, Fragment } from 'react';
import Users from './users';

class LDAPImportedUsers extends Component {

  render() {
    return <Users isLDAPImported={true} {...this.props} />;
  }
}

export default LDAPImportedUsers;

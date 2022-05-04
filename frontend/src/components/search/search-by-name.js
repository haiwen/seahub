import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SearchFileDialog from '../dialog/search-file-dialog.js';

import '../../css/top-search-by-name.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired
};

class SearchByName extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isDialogOpen: false
    };
  }

  toggleDialog = () => {
    this.setState({
      isDialogOpen: !this.state.isDialogOpen
    });
  }

  render() {
    const { repoID, repoName } = this.props;
    return (
      <Fragment>
        <i
          className="fas fa-search top-search-file-icon"
          onClick={this.toggleDialog}
          title={gettext('Search files in this library')}
        ></i>
        {this.state.isDialogOpen &&
        <SearchFileDialog
          repoID={repoID}
          repoName={repoName}
          toggleDialog={this.toggleDialog}
        />
        }
      </Fragment>
    );
  }
}

SearchByName.propTypes = propTypes;

export default SearchByName;

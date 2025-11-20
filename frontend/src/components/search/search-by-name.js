import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SearchFileDialog from '../dialog/search-file-dialog';

import '../../css/search-by-name.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired
};

const controlKey = Utils.isMac() ? '⌘' : 'Ctrl';

class SearchByName extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isDialogOpen: false
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onDocumentKeydown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onDocumentKeydown);
  }

  onDocumentKeydown = (e) => {
    if (isHotkey('mod+k')(e)) {
      this.toggleDialog();
    }
  };

  toggleDialog = () => {
    this.setState({
      isDialogOpen: !this.state.isDialogOpen
    });
  };

  render() {
    const { repoID, repoName } = this.props;
    return (
      <>
        <div className="search-by-name">
          <i className="input-icon-addon sf3-font sf3-font-search"></i>
          <div
            type="text"
            className="form-control search-input"
            name="query"
            onClick={this.toggleDialog}
            role="button"
            title={gettext('Search files in this library')}
            tabIndex={0}
            onKeyDown={Utils.onKeyDown}
          >
            {gettext('Search files') + ` (${controlKey} + k)`}
          </div>
        </div>
        {this.state.isDialogOpen &&
        <SearchFileDialog
          repoID={repoID}
          repoName={repoName}
          toggleDialog={this.toggleDialog}
        />
        }
      </>
    );
  }
}

SearchByName.propTypes = propTypes;

export default SearchByName;

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import WikiListItem from './wiki-list-item';

const contentpropTypes = {
  data: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikiListView extends Component {

  render() {
    let {loading, errorMsg, wikis} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      return (
        <table>
          <thead>
            <tr>
              <th width="50%">{gettext('Name')}</th>
              <th width="20%">{gettext('Owner')}</th>
              <th width="20%">{gettext('Last Update')}</th>
              <th width="10%">{/* operation */}</th>
            </tr>
          </thead>
          <tbody>
            {wikis.map((wiki, index) => {
              return(
                <WikiListItem key={index} wiki={wiki}
                  renameWiki={this.props.renameWiki}
                  deleteWiki={this.props.deleteWiki}
                />);
            })}
          </tbody>
        </table>
      );
    }
  }
}

WikiListView.propTypes = contentpropTypes;

export default WikiListView;
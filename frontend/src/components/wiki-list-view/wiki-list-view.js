import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import WikiListItem from './wiki-list-item';
import LibsMobileThead from '../libs-mobile-thead';

const propTypes = {
  data: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikiListView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    let { loading, errorMsg, wikis } = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const isDesktop = Utils.isDesktop();
      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="36%">{gettext('Name')}</th>
            <th width="25%">{gettext('Owner')}</th>
            <th width="25%">{gettext('Last Update')}</th>
            <th width="10%">{/* operation */}</th>
          </tr>
        </thead>
      );
      return (
        <table className={isDesktop ? '' : 'table-thead-hidden'}>
          {isDesktop ? desktopThead : <LibsMobileThead />}
          <tbody>
            {wikis.map((wiki, index) => {
              return (
                <WikiListItem
                  key={index}
                  wiki={wiki}
                  renameWiki={this.props.renameWiki}
                  deleteWiki={this.props.deleteWiki}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />
              );
            })}
          </tbody>
        </table>
      );
    }
  }
}

WikiListView.propTypes = propTypes;

export default WikiListView;

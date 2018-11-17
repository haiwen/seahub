import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import DraftListItem from './draft-list-item';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  draftList: PropTypes.array.isRequired,
  onMenuToggleClick: PropTypes.func.isRequired,
};

class DraftListView extends React.Component {

  render() {
    let drafts = this.props.draftList;
    return (
      <table>
        <thead>
          <tr>
            <th style={{width: '4%'}}>{/*img*/}</th>
            <th style={{width: '46%'}}>{gettext('Name')}</th>
            <th style={{width: '20%'}}>{gettext('Library')}</th>
            <th style={{width: '10%'}}>{gettext('Review')}</th>
            <th style={{width: '10%'}}>{gettext('Last Update')}</th>
            <th style={{width: '10%'}}></th>
          </tr>
        </thead>
        <tbody>
          { drafts && drafts.map((draft) => {
            return (
              <DraftListItem 
                key={draft.id} 
                draft={draft} 
                onMenuToggleClick={this.props.onMenuToggleClick} 
                isItemFreezed={this.props.isItemFreezed}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

DraftListView.propTypes = propTypes;

export default DraftListView;

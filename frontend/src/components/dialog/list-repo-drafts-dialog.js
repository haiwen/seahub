import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  drafts: PropTypes.array.isRequired,
};

class ListRepoDraftsDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let drafts = this.props.drafts;
    return (
      <Fragment>
        <ModalHeader toggle={this.props.onClose}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.props.onClose} aria-label={gettext('Back')}></span>
          {gettext('Drafts')}
        </ModalHeader>
        <ModalBody className="dialog-list-container">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Owner')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => {
                let href = siteRoot + 'lib/' + draft.repoID + '/file' + Utils.encodePath(draft.path);
                return (
                  <tr key={index}>
                    <td className="name">
                      <a href={href} target='_blank'>{Utils.getFileName(draft.path)}</a>
                    </td>
                    <td>{draft.owner}</td>
                    <td>{moment(draft.time).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.onClose}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

ListRepoDraftsDialog.propTypes = propTypes;

export default ListRepoDraftsDialog;

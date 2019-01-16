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
  reviews: PropTypes.array.isRequired,
};

class ListRepoReviewsDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let reviews = this.props.reviews;
    return (
      <Fragment>
        <ModalHeader toggle={this.props.onClose}>
          <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.props.onClose} aria-label={gettext('Back')}></span>
          {gettext('Reviews')}
        </ModalHeader>
        <ModalBody className="dialog-list-container">
          <table className="table-thead-hidden">
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Creator')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review, index) => {
                let href = siteRoot + 'drafts/review/' + review.id;
                return (
                  <tr key={index}>
                    <td className="name">
                      <a href={href} target='_blank'>{Utils.getFileName(review.draft_path)}</a>
                    </td>
                    <td>{review.creator}</td>
                    <td>{moment(review.time).fromNow()}</td>
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

ListRepoReviewsDialog.propTypes = propTypes;

export default ListRepoReviewsDialog;

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import Review from '../../models/review';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  reviewCounts: PropTypes.number.isRequired
};


class ListRepoReviewsDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      reviews: [],
    };
  }
  
  listRepoReivews = () => {
    seafileAPI.listRepoReviews(this.props.repoID).then(res => {
      this.setState({
        isOpen: true,
        reviews: res.data.reviews 
      })  
    })
  }

  toggle = () => {
    this.setState({
      isOpen: !this.state.isOpen
    });
  }

  render() {
    let reviews = this.state.reviews;
    return (
      <div className="readme-file">
        <i className="readme-flag sf2-icon-review" style={{'fontStyle': 'normal' }}></i>
        <span className="used-tag-name">{gettext('review')}</span>
        <span className="used-tag-files" onClick={this.listRepoReivews}>
          {this.props.reviewCounts > 1 ? this.props.reviewCounts + ' files' : this.props.reviewCounts + ' file'}
        </span>
        <Modal isOpen={this.state.isOpen}>
          <ModalHeader toggle={this.toggle}>
            <span className="tag-dialog-back fas fa-sm fa-arrow-left" onClick={this.toggle} aria-label={gettext('Back')}></span>
            {gettext('Reviews')}
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
                {this.state.reviews.map((item) => {
                  let review = new Review(item);
                  let href = siteRoot + 'drafts/review/' + review.id; 
                  return (
                    <tr key={review.id}>
                      <td className="name">
                        <a href={href} target='_blank'>{Utils.getFileName(review.draftFilePath)}</a>
                      </td>
                      <td>{review.creatorName}</td>
                      <td>{moment(review.createdStr).fromNow()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

ListRepoReviewsDialog.propTypes = propTypes;

export default ListRepoReviewsDialog;

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
  toggle: PropTypes.func.isRequired,
};


class ListRepoReviewsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      reviews: [],
    };
  }
  
  componentDidMount() {
    seafileAPI.listRepoReviews(this.props.repoID).then(res => {
      let reviews = res.data.reviews.map(item =>{
        let review = new Review(item);
        return review;
      });
      this.setState({
        reviews: reviews 
      }); 
    });
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    let reviews = this.state.reviews;
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Reviews')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Owner')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.reviews.map((review) => {
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
    );
  }
}

ListRepoReviewsDialog.propTypes = propTypes;

export default ListRepoReviewsDialog;

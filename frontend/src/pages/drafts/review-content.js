import React from 'react';
import { gettext } from '../../utils/constants';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';
import ReviewListView from '../../components/review-list-view/review-list-view';

class ReviewContent extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      reviewsList: [],
      isLoadingReviews: true,
      isItemFreezed: false, 
    };
  }

  componentDidMount() {
    this.initReviewList();
  }

  initReviewList() {
    this.setState({isLoadingReviews: true});
    editUtilties.listReviews().then(res => {
      this.setState({
        reviewsList: res.data.data,
        isLoadingReviews: false,
      });
    });
  }
  
  render() {
    return (
      <div className="cur-view-content">
        {this.state.isLoadingReviews && <Loading /> }
        {(!this.state.isLoadingReviews && this.state.reviewsList.length !==0) &&
          <ReviewListView
            itemsList={this.state.reviewsList} 
            isItemFreezed={this.state.isItemFreezed}
          />
        }
        {(!this.state.isLoadingReviews && this.state.reviewsList.length === 0) &&
          <div className="message empty-tip">
            <h2>{gettext('There is no Review file existing')}</h2>
          </div>
        }
      </div>
    );
  }
}

export default ReviewContent;

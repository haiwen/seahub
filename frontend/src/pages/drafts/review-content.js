import React from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../../components/loading';
import ReviewListView from '../../components/review-list-view/review-list-view';
import '../../css/review-content.css';

class ReviewContent extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      reviewsList: [],
      isLoadingReviews: true,
      isItemFreezed: false, 
      activeTab: 'open',
    };
  }

  componentDidMount() {
    this.getReviewList('open');
  }

  getReviewList = (reviewStatus) => {
    this.setState({isLoadingReviews: true});
    seafileAPI.listReviews(reviewStatus).then(res => {
      this.setState({
        reviewsList: res.data.data,
        isLoadingReviews: false,
        activeTab: reviewStatus,
      });
    });
  }
  
  render() {
    return (
      <div className="cur-view-content">
        {this.state.isLoadingReviews && <Loading /> }
        {!this.state.isLoadingReviews  &&
          <ReviewListView
            itemsList={this.state.reviewsList} 
            isItemFreezed={this.state.isItemFreezed}
            getReviewList={this.getReviewList}
            activeTab={this.state.activeTab}
          />
        }
      </div>
    );
  }
}

export default ReviewContent;

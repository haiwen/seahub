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
      activeTab: 'open',
    };
  }

  componentDidMount() {
    this.getReviewList('open');
  }

  getReviewList = (st) => {
    this.setState({isLoadingReviews: true})
    editUtilties.listReviews(st).then(res => {
      this.setState({
        reviewsList: res.data.data,
        isLoadingReviews: false,
        activeTab: st,
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

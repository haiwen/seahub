import React from 'react';
import classNames from 'classnames';
import { siteRoot, gettext } from '../../components/constants';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';

import ReviewsListView from '../../components/reviews-list-view/reviews-list-view';

class DraftsReviewsListView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      reviewsList: [],
      isLoadingReviews: true,
      isItemFreezed: false, 
    };
  }

  componentDidMount() {
    this.initReviewsList();
  }

  initReviewsList() {
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
      <div className="cur-view-content" style={{padding: 0}}>
       {this.state.isLoadingReviews && <Loading /> }
       {(!this.state.isLoadingReviews && this.state.reviewsList.length !==0) &&
         <ReviewsListView
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

export default DraftsReviewsListView;

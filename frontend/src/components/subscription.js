import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import toaster from './toast';
import { Modal, ModalBody, ModalFooter, InputGroup, InputGroupText, Input, Button } from 'reactstrap';
import { gettext, serviceURL } from '../utils/constants';
import { Utils } from '../utils/utils';
import { subscriptionAPI } from '../utils/subscription-api';
import Loading from './loading';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../css/layout.css';
import '../css/subscription.css';

const {
  isOrgContext,
} = window.app.pageOptions;


const PlansPropTypes = {
  plans: PropTypes.array.isRequired,
  onPay: PropTypes.func.isRequired,
  paymentType: PropTypes.string.isRequired,
  handleContentScroll: PropTypes.func.isRequired,
};

class Plans extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPlan: props.plans[0],
      assetQuotaUnitCount: 1,
      count: 1,
    };
  }

  togglePlan = (plan) => {
    this.setState({ currentPlan: plan }, () => {
    });
  };

  onPay = () => {
    let { paymentType } = this.props;
    let { currentPlan, assetQuotaUnitCount, count } = this.state;
    let totalAmount; let assetQuota; let newUserCount;

    // parse
    if (paymentType === 'paid') {
      newUserCount = currentPlan.count;
      totalAmount = currentPlan.total_amount;
    } else if (paymentType === 'extend_time') {
      newUserCount = currentPlan.count;
      assetQuota = currentPlan.asset_quota;
      totalAmount = currentPlan.total_amount;
    } else if (paymentType === 'add_user') {
      newUserCount = count;
      totalAmount = count * currentPlan.price_per_user;
    } else if (paymentType === 'buy_quota') {
      assetQuota = (assetQuotaUnitCount) * currentPlan.asset_quota_unit;
      totalAmount = assetQuotaUnitCount * currentPlan.price_per_asset_quota_unit;
    } else {
      toaster.danger(gettext('Internal Server Error'));
      return;
    }

    this.props.onPay(currentPlan.plan_id, newUserCount, assetQuota, totalAmount);
  };

  onCountInputChange = (e) => {
    let { currentPlan } = this.state;
    if (!currentPlan.can_custom_count) {
      return;
    }
    let count = e.target.value.replace(/^(0+)|[^\d]+/g, '');
    if (count < 1) {
      count = 1;
    } else if (count > 9999) {
      count = 9999;
    }
    this.setState({ count: count });
  };

  onAssetQuotaUnitCountInputChange = (e) => {
    let { currentPlan } = this.state;
    if (!currentPlan.can_custom_asset_quota) {
      return;
    }
    let count = e.target.value.replace(/^(0+)|[^\d]+/g, '');
    if (count < 1) {
      count = 1;
    } else if (count > 9999) {
      count = 9999;
    }
    this.setState({ assetQuotaUnitCount: count });
  };

  renderPaidOrExtendTime = () => {
    let { plans, paymentType } = this.props;
    let { currentPlan } = this.state;
    let boughtQuota = 0;
    if (paymentType === 'extend_time') {
      boughtQuota = currentPlan.asset_quota - 100;
    }
    let totalAmount = currentPlan.total_amount;
    let originalTotalAmount = totalAmount;
    return (
      <div className='d-flex flex-column subscription-container'>
        <span className="subscription-subtitle">{'选择方案'}</span>
        <dl className='items-dl'>
          {plans.map((item, index) => {
            let selectedCss = item.plan_id === currentPlan.plan_id ? 'plan-selected' : '';
            let countDescription = '￥' + item.price_per_user;
            if (isOrgContext) {
              countDescription += '/每用户';
            }
            return (
              <dd key={index} className={`plan-description-item ${selectedCss}`} onClick={this.togglePlan.bind(this, item)}>
                <span className='plan-name'>{item.name}</span>
                <span className='plan-description'>{countDescription}</span>
              </dd>
            );
          })}
        </dl>

        {paymentType === 'extend_time' && boughtQuota > 0 &&
          <Fragment>
            <span className="subscription-subtitle">{'增加空间'}</span>
            <dl className='items-dl'>
              <dd className='order-item order-item-top order-item-bottom subscription-list'>
                <span className='order-into'>{currentPlan.asset_quota_unit + 'GB x ' + (boughtQuota / currentPlan.asset_quota_unit)}</span>
                {/* 续费时候需要减去附赠的100GB */}
                <span className='order-value'>{'￥' + (boughtQuota / currentPlan.asset_quota_unit) * currentPlan.price_per_asset_quota_unit}</span>
              </dd>
            </dl>
          </Fragment>
        }

        <span className="subscription-subtitle">{'方案汇总'}</span>
        <dl className='items-dl'>
          <div>
            <dd className='order-item order-item-top'>
              <span className='order-into'>{'所选方案'}</span>
              <span className='order-value'>{currentPlan.name}</span>
            </dd>
            {isOrgContext &&
              <dd className='order-item'>
                <span className='order-into'>{'成员人数'}</span>
                <span className='order-value'>{currentPlan.count + '人'}</span>
              </dd>
            }
            <dd className='order-item'>
              <span className='order-into'>{'可用空间'}</span>
              <span className='order-value'>{'100GB(附赠)' + (boughtQuota > 0 ? '+' + boughtQuota + 'GB(扩充)' : '')}</span>
            </dd>
            <dd className='order-item order-item-bottom rounded-0'>
              <span className='order-into'>{'到期时间'}</span>
              <span className='order-value'>{currentPlan.new_term_end}</span>
            </dd>
            <dd className='order-item order-item-bottom subscription-list'>
              <span className='order-into'>{'实际支付金额'}</span>
              <span className='order-price'>
                {originalTotalAmount !== totalAmount &&
                  <span style={{ fontSize: 'small', textDecoration: 'line-through', color: '#9a9a9a' }}>{'￥' + originalTotalAmount}</span>
                }
                <span>{'￥' + totalAmount + ' '}</span>
              </span>
            </dd>
          </div>
        </dl>
        <Button className='subscription-submit' color="primary" onClick={this.onPay}>{'提交订单'}</Button>
      </div>
    );
  };

  renderAddUser = () => {
    let { currentPlan, count } = this.state;
    let operationIntro = '新增用户';
    let originalTotalAmount = count * currentPlan.price_per_user;
    let totalAmount = originalTotalAmount;
    return (
      <div className='d-flex flex-column subscription-container price-version-container-header subscription-add-user'>
        <div className="price-version-container-top"></div>
        <h3 className='user-quota-plan-name py-5'>{currentPlan.name}</h3>
        <span className='py-2 mb-0 text-orange font-500 text-center'>
          {'¥ '}<span className="price-version-plan-price">{currentPlan.price}</span>{' ' + currentPlan.description}
        </span>
        <InputGroup style={{ marginBottom: '5px' }} className='user-numbers'>
          <InputGroupText>{operationIntro}</InputGroupText>
          <Input
            className="py-2"
            placeholder={operationIntro}
            title={operationIntro}
            type="number"
            value={count || 1}
            min="1"
            max="9999"
            disabled={!currentPlan.can_custom_count}
            onChange={this.onCountInputChange}
          />
        </InputGroup>
        <span className='py-2 text-orange mb-0 font-500 price-version-plan-whole-price text-center'>
          {'总价 ¥ ' + totalAmount}
          {originalTotalAmount !== totalAmount &&
            <span style={{ fontSize: 'small', textDecoration: 'line-through', color: '#9a9a9a' }}>{' ￥' + originalTotalAmount}</span>
          }
        </span>
        <span className='py-2 mb-0 text-lg-size font-500 price-version-plan-valid-day text-center'>{'有效期至 ' + currentPlan.new_term_end}</span>
        <span className='subscription-notice text-center py-5'>{'注：当有效期剩余天数少于计划中的时候，增加用户的价格按天来计算'}</span>
        <Button className='subscription-submit' onClick={this.onPay} color="primary">{'立即购买'}</Button>
      </div>
    );
  };

  renderBuyQuota = () => {
    let { currentPlan, assetQuotaUnitCount } = this.state;
    let operationIntro = '新增空间';
    let originalTotalAmount = assetQuotaUnitCount * currentPlan.price_per_asset_quota_unit;
    let totalAmount = originalTotalAmount;
    return (
      <div className='d-flex flex-column subscription-container price-version-container-header subscription-add-space'>
        <div className="price-version-container-top"></div>
        <h3 className='user-quota-plan-name py-5'>{currentPlan.name}</h3>
        <span className='py-2 mb-0 text-orange font-500 text-center'>
          {'¥ '}<span className="price-version-plan-price">{currentPlan.asset_quota_price}</span>{' ' + currentPlan.asset_quota_description}
        </span>
        <InputGroup style={{ marginBottom: '5px' }} className='space-quota'>
          <InputGroupText><span className="font-500">{operationIntro}</span></InputGroupText>
          <Input
            className="py-2"
            placeholder={operationIntro}
            title={operationIntro}
            type="number"
            value={assetQuotaUnitCount || 1}
            min="1"
            max="9999"
            disabled={!currentPlan.can_custom_asset_quota}
            onChange={this.onAssetQuotaUnitCountInputChange}
          />
          <InputGroupText><span className="font-500">{' x ' + currentPlan.asset_quota_unit + 'GB'}</span></InputGroupText>
        </InputGroup>
        <span className='py-4 text-orange mb-0 font-500 price-version-plan-whole-price text-center'>
          {'总价 ¥ ' + totalAmount}
          {originalTotalAmount !== totalAmount &&
            <span style={{ fontSize: 'small', textDecoration: 'line-through', color: '#9a9a9a' }}>{' ￥' + originalTotalAmount}</span>
          }
        </span>
        <span className='py-2 mb-0 text-lg-size font-500 price-version-plan-valid-day text-center'>{'有效期至 ' + currentPlan.new_term_end}</span>
        <span className='subscription-notice text-center py-5'>{'注：当有效期剩余天数少于计划中的时候，增加空间的价格按天来计算'}</span>
        <Button className='subscription-submit' onClick={this.onPay} color="primary">{'立即购买'}</Button>
      </div>
    );
  };

  render() {
    let { paymentType } = this.props;
    if (paymentType === 'paid' || paymentType === 'extend_time') {
      return this.renderPaidOrExtendTime();
    } else if (paymentType === 'add_user') {
      return this.renderAddUser();
    } else if (paymentType === 'buy_quota') {
      return this.renderBuyQuota();
    } else {
      toaster.danger(gettext('Internal Server Error'));
      return;
    }
  }
}

Plans.propTypes = PlansPropTypes;

const PlansDialogPropTypes = {
  isOrgContext: PropTypes.bool.isRequired,
  paymentType: PropTypes.string.isRequired,
  paymentTypeTrans: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class PlansDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isWaiting: false,
      planList: [],
      paymentSourceList: [],
    };
  }

  getPlans = () => {
    subscriptionAPI.getSubscriptionPlans(this.props.paymentType).then((res) => {
      this.setState({
        planList: res.data.plan_list,
        paymentSourceList: res.data.payment_source_list,
        isLoading: false,
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg,
      });
    });
  };

  onPay = (planID, count, asset_quota, totalAmount) => {
    this.setState({ isWaiting: true });
    let payUrl = serviceURL + '/subscription/pay/?payment_source=' + this.state.paymentSourceList[0] +
      '&payment_type=' + this.props.paymentType + '&plan_id=' + planID +
      '&total_amount=' + totalAmount;
    if (count) {
      payUrl += '&count=' + count;
    }
    if (asset_quota) {
      payUrl += '&asset_quota=' + asset_quota;
    }
    window.open(payUrl);
  };

  onReload = () => {
    window.location.reload();
  };

  componentDidMount() {
    this.getPlans();
  }

  render() {
    const { isLoading, isWaiting, planList } = this.state;
    const { toggleDialog, paymentTypeTrans, paymentType } = this.props;
    const modalStyle = (paymentType === 'paid' || paymentType === 'extend_time') ?
      { width: '560px', maxWidth: '560px' } : { width: '560px' };

    if (isLoading) {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <SeahubModalHeader toggle={toggleDialog}>{paymentTypeTrans}</SeahubModalHeader>
          <ModalBody>
            <Loading />
          </ModalBody>
        </Modal>
      );
    }
    if (isWaiting) {
      return (
        <Modal isOpen={true} toggle={this.onReload}>
          <SeahubModalHeader toggle={this.onReload}>{paymentTypeTrans}</SeahubModalHeader>
          <ModalBody>
            <div>{'是否完成付款?'}</div>
          </ModalBody>
          <ModalFooter>
            <button className="btn btn-outline-primary" onClick={this.onReload}>{'是'}</button>
          </ModalFooter>
        </Modal>
      );
    }
    return (
      <Modal isOpen={true} toggle={toggleDialog} style={modalStyle}>
        <SeahubModalHeader toggle={toggleDialog}>{paymentTypeTrans}</SeahubModalHeader>
        <ModalBody>
          <div className="d-flex justify-content-between">
            <Plans
              plans={planList}
              onPay={this.onPay}
              paymentType={this.props.paymentType}
            />
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

PlansDialog.propTypes = PlansDialogPropTypes;

const propTypes = {
  isOrgContext: PropTypes.bool.isRequired,
  handleContentScroll: PropTypes.func,
};

class Subscription extends Component {

  constructor(props) {
    super(props);
    this.paymentTypeTransMap = {
      paid: '立即购买',
      extend_time: '立即续费',
      add_user: '增加用户',
      buy_quota: '增加空间',
    };
    this.state = {
      isLoading: true,
      errorMsg: '',
      isDialogOpen: false,
      planName: this.props.isOrgContext ? '团队版' : '个人版',
      userLimit: 20,
      assetQuota: 1,
      termEnd: '长期',
      subscription: null,
      paymentTypeList: [],
      currentPaymentType: '',
      errorMsgCode: ''
    };
  }

  getSubscription = () => {
    subscriptionAPI.getSubscription().then((res) => {
      const subscription = res.data.subscription;
      const paymentTypeList = res.data.payment_type_list;
      if (!subscription) {
        this.setState({
          isLoading: false,
          paymentTypeList: paymentTypeList,
        });
      } else {
        let isActive = subscription.is_active;
        let plan = subscription.plan;
        this.setState({
          isLoading: false,
          subscription,
          planName: plan.name,
          userLimit: subscription.user_limit,
          assetQuota: isActive ? subscription.asset_quota : plan.asset_quota,
          termEnd: isActive ? subscription.term_end : '已过期',
          paymentTypeList: paymentTypeList,
        });
      }
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg,
      });
    });
  };

  toggleDialog = () => {
    this.setState({ isDialogOpen: !this.state.isDialogOpen });
  };

  togglePaymentType = (paymentType) => {
    this.setState({ currentPaymentType: paymentType });
    this.toggleDialog();
  };

  componentDidMount() {
    this.getSubscription();
  }

  render() {
    const { isLoading, errorMsg, planName, userLimit, assetQuota, termEnd,
      isDialogOpen, paymentTypeList, currentPaymentType } = this.state;
    if (isLoading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="text-center mt-8 error">{errorMsg}</p>;
    }
    return (
      <Fragment>
        <div className="content position-relative" onScroll={this.props.handleContentScroll}>
          <div id="current-plan" className="subscription-info">
            <h3 className="subscription-info-heading">{'当前版本'}</h3>
            <p className="mb-2">{planName}</p>
          </div>
          {this.props.isOrgContext &&
            <div id="user-limit" className="subscription-info">
              <h3 className="subscription-info-heading">{'用户数限制'}</h3>
              <p className="mb-2">{userLimit}</p>
            </div>
          }
          <div id="asset-quota" className="subscription-info">
            <h3 className="subscription-info-heading">{'空间'}</h3>
            <p className="mb-2">{assetQuota ? assetQuota + 'GB' : '1GB'}</p>
          </div>
          <div id="current-subscription-period" className="subscription-info">
            <h3 className="subscription-info-heading">{'订阅有效期'}</h3>
            <p className="mb-2">{termEnd}</p>
          </div>
          <div id="product-price" className="subscription-info">
            <h3 className="subscription-info-heading">{'云服务付费方案'}</h3>
            <p className="mb-2">
              <a rel="noopener noreferrer" target="_blank" href="https://www.seafile.com/seafile-docs/home/">{'查看详情'}</a>
            </p>
          </div>
          {paymentTypeList.map((item, index) => {
            let name = this.paymentTypeTransMap[item];
            return (
              <button
                key={index}
                className="btn btn-outline-primary mr-4"
                onClick={this.togglePaymentType.bind(this, item)}
              >{name}
              </button>
            );
          })}
          {!this.state.subscription &&
            <div id="sales-consultant" className="subscription-info mt-6">
              <h3 className="subscription-info-heading">{'销售咨询'}</h3>
              <img className="mb-2" src="/media/img/qr-sale.png" alt="" width="112"></img>
              <p className="mb-2">{'微信扫码联系销售'}</p>
            </div>
          }
        </div>
        {isDialogOpen &&
          <PlansDialog
            paymentType={currentPaymentType}
            paymentTypeTrans={this.paymentTypeTransMap[currentPaymentType]}
            isOrgContext={this.props.isOrgContext}
            toggleDialog={this.toggleDialog}
          />
        }
      </Fragment>
    );
  }
}

Subscription.propTypes = propTypes;

export default Subscription;

from django.conf import settings
from django.db import transaction

from seahub.admin_log.models import ORG_AI_CREDIT_ADJUST, ORG_AI_CREDIT_SET
from seahub.admin_log.signals import admin_operation
from seahub.ai.models import OrgAdditionalCredit, OrgAdditionalCreditStripeSession


MAX_AI_CREDIT_BALANCE = (1 << 63) - 1


class InsufficientAICredit(Exception):
    pass


class AICreditSessionConflict(Exception):
    pass


def get_org_additional_ai_credit(org_id):
    balance = OrgAdditionalCredit.objects.filter(org_id=org_id).values_list('balance', flat=True).first()
    return balance if balance is not None else 0


def _lock_org_credit(org_id):
    OrgAdditionalCredit.objects.get_or_create(org_id=org_id)
    return OrgAdditionalCredit.objects.select_for_update().get(org_id=org_id)


def _save_credit(credit, balance, operation, operator):
    before = credit.balance
    credit.balance = balance
    credit.save(update_fields=['balance', 'updated_at'])
    admin_operation.send(
        sender=None,
        admin_name=operator,
        operation=operation,
        detail={
            'org_id': credit.org_id,
            'balance_before': before,
            'balance_after': balance,
            'delta': balance - before,
        },
    )


def set_org_additional_ai_credit(org_id, balance, operator):
    if type(balance) is not int or not 0 <= balance <= MAX_AI_CREDIT_BALANCE:
        raise ValueError('balance must be a non-negative integer within the BIGINT range.')

    with transaction.atomic():
        credit = _lock_org_credit(org_id)
        _save_credit(credit, balance, ORG_AI_CREDIT_SET, operator)
    return balance


def adjust_org_additional_ai_credit(org_id, delta, operator, stripe_session_id=None):
    if type(delta) is not int or delta == 0 or abs(delta) > settings.ORG_ADDITIONAL_AI_CREDIT_MAX_ADJUSTMENT:
        raise ValueError('delta must be a non-zero integer within the adjustment limit.')
    if stripe_session_id is not None:
        if not isinstance(stripe_session_id, str) or not stripe_session_id.strip() or len(stripe_session_id) > 255:
            raise ValueError('stripe_session_id invalid.')
        if delta < 0:
            raise ValueError('delta must be positive for a Stripe payment.')

    with transaction.atomic():
        if stripe_session_id is not None:
            stripe_session, created = OrgAdditionalCreditStripeSession.objects.get_or_create(
                stripe_session_id=stripe_session_id,
                defaults={'org_id': org_id},
            )
            if stripe_session.org_id != org_id:
                raise AICreditSessionConflict
            if not created:
                return get_org_additional_ai_credit(org_id), True

        credit = _lock_org_credit(org_id)
        balance = credit.balance + delta
        if balance < 0:
            raise InsufficientAICredit
        if balance > MAX_AI_CREDIT_BALANCE:
            raise ValueError('balance exceeds the BIGINT range.')
        _save_credit(credit, balance, ORG_AI_CREDIT_ADJUST, operator)

    return balance, False

import uuid

from django.db import IntegrityError, transaction

from seahub.ai.models import AICreditTransaction, OrgAdditionalAICredit


class AICreditTransactionConflict(Exception):
    pass


def _get_existing_transaction(org_id, credit_delta, transaction_id):
    credit_transaction = AICreditTransaction.objects.filter(transaction_id=transaction_id).first()
    if not credit_transaction:
        return None
    if credit_transaction.org_id != org_id or credit_transaction.requested_delta != credit_delta:
        raise AICreditTransactionConflict
    return credit_transaction


def get_org_additional_ai_credit(org_id):
    credit = OrgAdditionalAICredit.objects.filter(org_id=org_id).first()
    return credit.credits if credit else 0


def _ensure_org_additional_ai_credit(org_id):
    OrgAdditionalAICredit.objects.get_or_create(
        org_id=org_id,
        defaults={'credits': 0},
    )


def set_org_additional_ai_credit(org_id, credits, operator=''):
    _ensure_org_additional_ai_credit(org_id)
    with transaction.atomic():
        credit = OrgAdditionalAICredit.objects.select_for_update().get(org_id=org_id)
        credits_before = credit.credits
        credit.credits = credits
        credit.save(update_fields=['credits', 'updated_at'])

        credit_transaction = AICreditTransaction.objects.create(
            transaction_id='admin-%s' % uuid.uuid4(),
            org_id=org_id,
            operation='set',
            source='admin',
            requested_delta=credits - credits_before,
            applied_delta=credits - credits_before,
            credits_before=credits_before,
            credits_after=credits,
            operator=operator,
        )

    return credit_transaction


def adjust_org_additional_ai_credit(org_id, credit_delta, transaction_id, source='billing'):
    existing_transaction = _get_existing_transaction(org_id, credit_delta, transaction_id)
    if existing_transaction:
        return existing_transaction, True

    _ensure_org_additional_ai_credit(org_id)
    try:
        with transaction.atomic():
            credit = OrgAdditionalAICredit.objects.select_for_update().get(org_id=org_id)
            existing_transaction = _get_existing_transaction(org_id, credit_delta, transaction_id)
            if existing_transaction:
                return existing_transaction, True

            credits_before = credit.credits
            credits_after = max(credits_before + credit_delta, 0)
            applied_delta = credits_after - credits_before

            credit.credits = credits_after
            credit.save(update_fields=['credits', 'updated_at'])

            credit_transaction = AICreditTransaction.objects.create(
                transaction_id=transaction_id,
                org_id=org_id,
                operation='adjust',
                source=source,
                requested_delta=credit_delta,
                applied_delta=applied_delta,
                credits_before=credits_before,
                credits_after=credits_after,
            )
    except IntegrityError:
        existing_transaction = _get_existing_transaction(org_id, credit_delta, transaction_id)
        if existing_transaction:
            return existing_transaction, True
        raise

    return credit_transaction, False

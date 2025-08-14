import os
import sys
import logging
from seahub.organizations.signals import org_operation_signal
logger = logging.getLogger(__name__)

try:
    conf_dir = os.environ['SEAFILE_CENTRAL_CONF_DIR']
    sys.path.append(conf_dir)
    try:
        from seahub_custom_functions import org_operation_callback
        org_operation_signal.connect(org_operation_callback)
    except ImportError as e:
        logger.error(e)
except KeyError as e:
    logger.error(e)

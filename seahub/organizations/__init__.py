import os
import sys
import logging
from seahub.organizations.signals import org_created, org_reactivated
logger = logging.getLogger(__name__)

try:
    conf_dir = os.environ['SEAFILE_CENTRAL_CONF_DIR']
    sys.path.append(conf_dir)
    try:
        from seahub_custom_functions import org_created_callback
        org_created.connect(org_created_callback)
    except ImportError as e:
        logger.debug(e)

    try:
        from seahub_custom_functions import org_reactivated_callback
        org_reactivated.connect(org_reactivated_callback)
    except ImportError as e:
        logger.debug(e)
except KeyError as e:
    logger.debug(e)

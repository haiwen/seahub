# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.two_factor.models.base import Device, get_available_methods
from seahub.two_factor.models.totp import TOTPDevice
from seahub.two_factor.models.phone import PhoneDevice
from seahub.two_factor.models.static import StaticDevice, StaticToken

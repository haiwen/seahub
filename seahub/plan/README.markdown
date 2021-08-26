## Usage ##

Added following to `local_settings.py` to enable plan checking:

    EXTRA_MIDDLEWARE_CLASSES = (
        'seahub_extra.plan.middleware.PlanMiddleware',
    )
    EXTRA_INSTALLED_APPS = (
        'seahub_extra.plan',
    )

Added following to `local_settings.py` to overwrite default plan setting:

    PLAN = {
        'Free': {
            'desc': 'Free',
            'storage': 1,               # GB
            'share_link_traffic': 5,    # GB/month
            'num_of_groups': 3,
            'group_members': 6,
        },
        'A': {
            'desc': 'Small Team',
            'storage': 100,             # GB
            'share_link_traffic': 100,  # GB/month
            'num_of_groups': 8,
            'group_members': 16,
            'pricing': 10,              # $/month
        },
        'B': {
            'desc': 'Large Team',
            'storage': 500,             # GB
            'share_link_traffic': 500,  # GB/month
            'num_of_groups': -1,        # no limit
            'group_members': -1,        # no limit
            'pricing': 50,              # $/month
        },
    }

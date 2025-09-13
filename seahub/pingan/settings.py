import seahub.settings as settings

# DMZ
PINGAN_DMZ_DOMAIN = getattr(settings, 'PINGAN_DMZ_DOMAIN', 'https://pafile2.pingan.com.cn')
PINGAN_IS_DMZ_SERVER = getattr(settings, 'PINGAN_IS_DMZ_SERVER', False)
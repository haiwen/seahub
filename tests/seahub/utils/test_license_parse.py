import os

from mock import patch

from seahub.utils.licenseparse import user_number_over_limit, \
    parse_license


@patch('seahub.utils.licenseparse.get_license_path')
def test_parse_license(mock_get_license_path):
    license_file = os.path.join(os.getcwd(), 'tests/seahub/utils/seafile-license.txt')
    mock_get_license_path.return_value = license_file

    license_dict = parse_license()

    assert license_dict['Hash'] == 'hash value'

@patch('seahub.utils.licenseparse.parse_license')
@patch('seahub.utils.licenseparse.is_pro_version')
def test_not_user_number_over_limit(mock_is_pro_version, mock_parse_license):

    # max user is 1000
    license_dict = {'Expiration': '2017-7-20',
     'Hash': 'hash value',
     'LicenceKEY': '1474598078',
     'Licencetype': 'User',
     'MaxUsers': '1000',
     'Mode': 'subscription',
     'Name': 'Test',
     'ProductID': 'Seafile server'}

    mock_is_pro_version.return_value = True
    mock_parse_license.return_value = license_dict

    assert not user_number_over_limit()

@patch('seahub.utils.licenseparse.parse_license')
@patch('seahub.utils.licenseparse.is_pro_version')
def test_user_number_over_limit(mock_is_pro_version, mock_parse_license):

    # max user is 1
    license_dict = {'Expiration': '2017-7-20',
     'Hash': 'hash value',
     'LicenceKEY': '1474598078',
     'Licencetype': 'User',
     'MaxUsers': '1',
     'Mode': 'subscription',
     'Name': 'Test',
     'ProductID': 'Seafile server'}

    mock_is_pro_version.return_value = True
    mock_parse_license.return_value = license_dict

    assert user_number_over_limit()

@patch('seahub.utils.licenseparse.is_pro_version')
def test_user_number_over_limit_if_not_pro(mock_is_pro_version):

    mock_is_pro_version.return_value = False

    assert not user_number_over_limit()

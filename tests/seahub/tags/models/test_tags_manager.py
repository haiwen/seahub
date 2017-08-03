from seahub.tags.models import Tags
from seahub.test_utils import BaseTestCase


class TagsManagerTest(BaseTestCase):
    def setUp(self):
        pass

    def test_create_tag(self):
        assert 'a' == Tags.objects.get_or_create_tag('a').name

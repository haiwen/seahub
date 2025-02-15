# -*- coding: utf-8 -*-
import io
import time
import base64
import random
import logging
import requests
from PIL import Image

from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import SLIDE_CAPTCHA_IMAGE_URL, ENABLE_SLIDE_CAPTCHA
from seahub.utils import SESSION_KEY_SLIDE_CAPTCHA_VERIFIED_TIME


logger = logging.getLogger(__name__)
WIDTH = 310  # pic size 310x155
HEIGHT = 155
SQUARE = 50  # square size 50x50
SESSION_KEY_SLIDE_CAPTCHA_X = 'slide-captcha-x'
SESSION_KEY_SLIDE_CAPTCHA_Y = 'slide-captcha-y'


def get_random_image():
    url = SLIDE_CAPTCHA_IMAGE_URL + str(random.randrange(1, 1084)) + '.jpg'
    response = requests.get(url, timeout=10)
    return Image.open(io.BytesIO(response.content))


def crop_image(image, x, y):
    box = (x, y, x + SQUARE, y + SQUARE)
    image_crop = image.crop(box)
    return image_crop


def paste_image(image, x, y):
    image_paste = image.convert('RGBA')
    image_grey = Image.new(
        'RGBA', size=(SQUARE, SQUARE), color=(0, 0, 0, 160))
    image_paste.paste(
        image_grey, (x, y, x + SQUARE, y + SQUARE), mask=image_grey)
    return image_paste.convert('RGB')


def merge_image(image_paste, image_crop, x, y):
    image_merge = Image.new(
        'RGB', size=(WIDTH, HEIGHT + SQUARE + y), color=(255, 255, 255))
    image_merge.paste(image_paste, (0, 0, WIDTH, HEIGHT))
    image_merge.paste(
        image_crop, (0, HEIGHT, SQUARE, HEIGHT + SQUARE))
    return image_merge


class SlideCaptchaView(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        if not ENABLE_SLIDE_CAPTCHA:
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature is not enabled.')

        x = random.randrange(50, 250)  # 50 < x < 250
        y = random.randrange(10, 100)  # 10 < y < 100

        # session
        request.session[SESSION_KEY_SLIDE_CAPTCHA_X] = x
        request.session[SESSION_KEY_SLIDE_CAPTCHA_Y] = y
        try:
            del request.session[SESSION_KEY_SLIDE_CAPTCHA_VERIFIED_TIME]
        except Exception:
            pass

        # source image
        image = get_random_image()
        # small square image
        image_crop = crop_image(image, x, y)
        # source image with small grey square
        image_paste = paste_image(image, x, y)
        # merge
        image_merge = merge_image(image_paste, image_crop, x, y)

        # Image to base64
        img_buffer = io.BytesIO()
        image_merge.save(img_buffer, format='JPEG')
        image_bytes = img_buffer.getvalue()
        image_base64 = base64.b64encode(image_bytes)

        return HttpResponse(image_base64)

    def post(self, request):
        if not ENABLE_SLIDE_CAPTCHA:
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature is not enabled.')
        try:
            del request.session[SESSION_KEY_SLIDE_CAPTCHA_VERIFIED_TIME]
        except Exception:
            pass

        if not hasattr(request.data, 'get'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Bad request')

        x = request.data.get('x')
        y = request.data.get('y')
        if not x or not y:
            return api_error(status.HTTP_400_BAD_REQUEST, 'x or y invalid')
        try:
            x = int(x)
            y = int(y)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'x or y invalid')

        target_x = request.session.get(SESSION_KEY_SLIDE_CAPTCHA_X)
        target_y = request.session.get(SESSION_KEY_SLIDE_CAPTCHA_Y)
        try:
            del request.session[SESSION_KEY_SLIDE_CAPTCHA_X]
            del request.session[SESSION_KEY_SLIDE_CAPTCHA_Y]
        except Exception:
            pass
        if not target_x or not target_y:
            return api_error(status.HTTP_404_NOT_FOUND, 'Slide captcha not found')

        # verify
        if y == target_y and abs(x - target_x) < 4:
            request.session[
                SESSION_KEY_SLIDE_CAPTCHA_VERIFIED_TIME] = int(time.time())
            return Response({'success': True})
        else:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Verify failed')

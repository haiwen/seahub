from django.db import models
from django.forms import ModelForm, Textarea

class Notification(models.Model):
    message = models.CharField(max_length=512)
    primary = models.BooleanField(default=False)

class UserNotification(models.Model):
    email = models.EmailField(max_length=255)
    note_type = models.CharField(max_length=30)
    detail = models.CharField(max_length=100)
    
class NotificationForm(ModelForm):
    """
    Form for adding notification.
    """
    class Meta:
        model = Notification
        fields = ('message', 'primary')
        widgets = {
            'message': Textarea(),
        }
    

from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin
from .models import OutgoingMail


@admin.register(OutgoingMail)
class OutgoingMailAdmin(SummernoteModelAdmin):
    search_fields = ['email', 'subject']
    list_display = ['email', 'subject', 'sent',]
    summernote_fields = ('html_content',)
    list_filter = ['sent',]
    list_display_links = ('email', 'subject',)

    fields = ['email', 'subject', 'html_content',]

from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin
from .models import OutgoingMail
from .tasks import launch_mailing


@launch_mailing()
def send_outgoing_mail(obj):
    return obj


class OutgoingMailSentFilter(admin.SimpleListFilter):
    title = ('Статус письма')
    parameter_name = 'sent'

    def lookups(self, request, model_admin):
        return (
            ('sent', ('Отправленные')),
            ('unsent', ('Не отправленные')),
        )

    def queryset(self, request, queryset):
        if self.value() == 'sent':
            return queryset.exclude(sent_date__isnull=True)
        if self.value() == 'unsent':
            return queryset.filter(sent_date__isnull=True)


@admin.register(OutgoingMail)
class OutgoingMailAdmin(SummernoteModelAdmin):
    search_fields = ['email', 'subject']
    list_display = ['email', 'subject', 'sent_date',]
    summernote_fields = ('html_content',)
    list_filter = [OutgoingMailSentFilter,]
    list_display_links = ('email', 'subject',)

    fields = ['email', 'subject', 'html_content',]

    actions = ['put_in_mail_queue']

    @admin.action(description='Поместить в очередь отправки')
    def put_in_mail_queue(self, request, queryset):
        for obj in queryset:
            send_outgoing_mail(obj)

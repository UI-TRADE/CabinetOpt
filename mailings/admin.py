from django.contrib import admin
from django_summernote.admin import SummernoteModelAdmin
from .models import OutgoingMail, MailingOfLetters
from .tasks import launch_mailing, get_email_addresses, create_outgoing_mail

from clients.models import Client


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


class CustomerSegmentsInline(admin.TabularInline):

    extra = 0
    model = MailingOfLetters.segment.through
    verbose_name = 'Сегмент'
    verbose_name_plural = 'Сегменты'


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


@admin.register(MailingOfLetters)
class MailingOfLettersAdmin(SummernoteModelAdmin):
    readonly_fields = []
    search_fields = ['name', 'status']
    list_display = ['created_at', 'name', 'status', 'subject',]
    summernote_fields = ('template',)
    list_filter = ['status',]
    list_display_links = ('created_at', 'name', 'status', 'subject')
    fields = ['name', 'subject', 'template',]

    inlines = (CustomerSegmentsInline,)

    actions = ['set_sent_status']
    @admin.action(description='Установить статус к отправке')
    def set_sent_status(self, request, queryset):
        for obj in queryset:
            obj.status=MailingOfLetters.SENT
            obj.save(update_fields=['status'])
            create_outgoing_mail({
                'recipient_list'   : list(set(get_email_addresses(
                    Client.objects.all().prefetch_related('client_segments').filter(client_segments__in=obj.segment.all())    
                ))),
                'subject'          : obj.subject,
                'template'         : obj.template,
                'context'          : {},
                'mailing_of_letter': obj,
            })


    def get_readonly_fields(self, request, obj=None):
        if obj and obj.status != MailingOfLetters.NEW:
            return list(self.readonly_fields) + \
            [field.name for field in obj._meta.fields] + \
            [field.name for field in obj._meta.many_to_many]
        return self.readonly_fields


    def get_inline_instances(self, request, obj=None):
        inline_instances = []
        for inline_class in self.inlines:
            if self.should_show_inline(request, obj, inline_class):
                inline = inline_class(self.model, self.admin_site)
                inline_instances.append(inline)
        return inline_instances
    

    def should_show_inline(self, request, obj, inline_class):
        if not obj:
            return True
        if obj.status == MailingOfLetters.NEW:
            return True
        return False
    

    def get_fields(self, request, obj=None):
        fields = super().get_fields(request, obj)
        if not 'segment' in fields:
            fields.append('segment')    
        if not obj and 'segment' in fields:
            fields.remove('segment')
        elif obj and obj.status == MailingOfLetters.NEW and 'segment' in fields:
            fields.remove('segment')
        return fields

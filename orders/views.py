import simplejson as json

from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.contrib.staticfiles import finders
from django.contrib.auth import get_user_model
from django.core.serializers import serialize
from django.core.exceptions import ValidationError
from django.db.models import F, Sum, Count
from django.views.generic import (
    ListView, UpdateView, CreateView, TemplateView
)
from django.template.loader import get_template
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from collections import defaultdict
from contextlib import suppress

from more_itertools import first
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer

# from xhtml2pdf import pisa

from clients.login import Login
from clients.models import Client, Manager, ContactDetail
from catalog.models import Product, StockAndCost, Size, PriceType
from orders.models import Order, OrderItem

from .forms import (
    OrderForm,
    OrderItemForm,
    OrderItemInline,
    FileSelectionForm
)
from .utils import save_xlsx, read_xlsx
from utils.exceptions import handle_errors
from settings_and_conditions.models import NotificationType
from settings_and_conditions.utils import notification_scheduling

from utils.requests import handle_get_params


class ProductSerializer(ModelSerializer):

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'articul',
            'unit',
            'available_for_order',
            'show_on_site',
            'product_type',
            'metal',
            'metal_content',
            'color',
            'status',
            'identifier_1C'
        ]


class SizeSerializer(ModelSerializer):

    class Meta:
        model = Size
        fields = '__all__'


class OrderItemSerializer(ModelSerializer):

    product = ProductSerializer()
    size = SizeSerializer()

    class Meta:
        model = OrderItem
        fields = '__all__'


class UserSerializer(ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = [
            'id',
            'is_superuser',
            'username',
            'is_active',
            'is_staff',
            'name',
            'email',
            'phone',
            'gender'
        ]


class ManagerSerializer(ModelSerializer):

    class Meta:
        model = Manager
        fields = ['id', 'name', 'email', 'phone', 'login']


class ClientSerializer(ModelSerializer):

    manager_talant = UserSerializer()
    manager = ManagerSerializer(many=True)

    class Meta:
        model = Client
        fields = '__all__'



class OrderSerializer(ModelSerializer):

    client = ClientSerializer()
    manager = ManagerSerializer()

    class Meta:
        model = Order
        fields = '__all__'


class OrderView(ListView):
    model = Order
    template_name = 'pages/orders.html'
    context_object_name = 'orders'
    allow_empty = True

    @handle_get_params()
    def get(self, request, *args, **kwargs):
        self.share_link = kwargs.get('link', '')
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        login = Login(self.request)
        current_clients = login.get_clients()
        if not current_clients:
            return super().get_queryset().order_by('-created_at')[:10]
        return Order.objects.filter(client__in=current_clients).order_by('-created_at')[:10]

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        return context | {
            'order_items': OrderItem.objects.filter(order__in=context['orders']),
            'share_link' : self.share_link,
            'MEDIA_URL'  : settings.MEDIA_URL
        }


class EditOrderView(UpdateView):
    model = Order
    slug_url_kwarg, slug_field = 'order_id', 'pk'
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]

    def get_form(self):
        form = super().get_form()
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
        return form

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST, instance=self.object)
        else:
            context['order_items'] = OrderItemInline(instance=self.object)
        context['empty_items'] = context['order_items'].empty_form
        context['fields'] = [
            {"id": "_id_status", "label": "Статус:", "value": context['order'].get_status_display()},
            {"id": "_id_client", "label": "Клиент:", "value": context['order'].client},
            {"id": "_id_manager", "label": "Менеджер:", "value": context['order'].manager}
        ]

        # Возможно перенести в класс Login для свободного обмена токенами через SessionStorage
        # from users.models import CustomUser
        # context['auth'] = ''
        # token = Token.objects.filter(
        #     user__in=CustomUser.objects.filter(is_superuser=True)
        # ).first()
        # if (token):
        #     context['auth'] = token.key

        return context

    def form_valid(self, form):
        context = self.get_context_data()
        order_items = context['order_items']
        if form.is_valid() and order_items.is_valid():
            current_status = form.instance.status
            with suppress(Order.DoesNotExist):
                current_order = Order.objects.get(pk=form.instance.id)
                current_status = current_order.status
            with transaction.atomic():
                form.instance.save()
                for order_item in order_items.deleted_forms:
                    order_item.instance.delete()
                order_items.save()
                schedule_send_order(form.instance, current_status)
        else:
            if form.errors:
                context['order_errors'] = form.errors
            if order_items.errors:
                context['order_items_errors'] = order_items.errors  
            
        return render(self.request, self.template_name, context)


class UpdateOrderView(UpdateView):
    model = Order
    slug_url_kwarg, slug_field = 'order_id', 'pk'
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]

    def get_form(self):
        form = super().get_form()
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
        return form

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST, instance=self.object)
        else:
            context['order_items'] = OrderItemInline(instance=self.object)
        context['empty_items'] = context['order_items'].empty_form
        context['fields'] = [
            {"id": "_id_status", "label": "Статус:", "value": context['order'].get_status_display()},
            {"id": "_id_client", "label": "Клиент:", "value": context['order'].client},
            {"id": "_id_manager", "label": "Менеджер:", "value": context['order'].manager}
        ]
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        order_items = context['order_items']
        if form.is_valid() and order_items.is_valid():
            current_status = form.instance.status
            with suppress(Order.DoesNotExist):
                current_order = Order.objects.get(pk=form.instance.id)
                current_status = current_order.status
            with transaction.atomic():
                form.instance.save()
                for order_item in order_items.deleted_forms:
                    order_item.instance.delete()
                order_items.save()
            
            schedule_send_order(form.instance, current_status)
        return redirect('orders:orders')


class SplitOrderView(TemplateView):
    slug_url_kwarg, slug_field = 'order_id', 'pk'
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]

    def split_products(self, order_items):
        _out_of_stock = []
        _in_stock = defaultdict(list)

        for item in order_items:
            product_id = item['product'].id
            if item.get('size') and item['size'].name:
                stocks = StockAndCost.objects.get_stocks(product_id, item['size'].name)
            else:
                stocks = StockAndCost.objects.get_stocks(product_id)   
            if not stocks:
                _out_of_stock.append(item)
                continue
            elif not stocks.get('total_stock', 0):
                _out_of_stock.append(item)
                continue
            elif stocks['total_stock'] < item['quantity']:
                current_stock = stocks['total_stock']
                item_out_of_stock = item.copy()
                item_out_of_stock['quantity'] = item['quantity'] - current_stock
                item_out_of_stock['total_price'] = item_out_of_stock['quantity'] * item_out_of_stock['price']
                _out_of_stock.append(item_out_of_stock)

                item['quantity'] = current_stock
                item['total_price'] = item['quantity'] * item['price']

            if item['quantity'] > 0:
                _in_stock[item['product'].metal].append(item)

        return _in_stock, _out_of_stock

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['object'] = Order.objects.get(pk=self.kwargs[self.slug_url_kwarg])
        context['fields'] = {
            "status": context['object'].status,
            "client": context['object'].client,
            "manager": context['object'].manager
        }
        
        return context
    
    def post(self, request, *args, **kwargs):
        context = self.get_context_data()
        form = OrderForm(self.request.POST)
        order_items = OrderItemInline(self.request.POST, instance=context['object'])
        if form.is_valid() and order_items.is_valid():
            current_status = context['fields']['status']
            _in_stock, _out_of_stock = self.split_products(order_items.cleaned_data)
            if _in_stock:
                if isinstance(_in_stock, defaultdict):
                    for key, item in _in_stock.items():
                        if key == first([key for key, _ in _in_stock.items()], ''):
                            update_order(context['object'], self.request.POST, item)
                            schedule_send_order(context['object'], current_status)
                        else:
                            new_instance = create_order(
                                context['fields'],
                                form.cleaned_data['status'],
                                'П', item
                            )
                            schedule_send_order(new_instance, current_status)

                    if _out_of_stock:
                        new_instance = create_order(
                            context['fields'],
                            form.cleaned_data['status'],
                            'З', _out_of_stock
                        )
                        schedule_send_order(new_instance, current_status)

                else:
                    update_order(context['object'], self.request.POST, _in_stock)
                    new_instance = create_order(
                        context['fields'],
                        form.cleaned_data['status'],
                        'З', _out_of_stock
                    )

                    schedule_send_order(context['object'], current_status)
                    schedule_send_order(new_instance, current_status)

            else:
                context['object'].provision = 'З'
                update_order(context['object'], self.request.POST, _out_of_stock)
                schedule_send_order(context['object'], current_status)


        return redirect('orders:orders')


class CreateOrderView(CreateView):
    model = Order
    template_name = 'pages/order.html'
    success_url = reverse_lazy('orders')
    fields = ['status', 'client', 'manager',]
    
    def get_form(self):
        form = super().get_form()
        for field in form.fields:
            form.fields[field].widget.attrs['class'] = 'form-control'
        return form

    def get_initial(self):
        initial = super().get_initial()
        order = get_object_or_404(Order, id=self.kwargs['order_id'])
        initial['client'] = order.client
        initial['manager'] = order.manager
        return initial

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        order = get_object_or_404(Order, id=self.kwargs['order_id'])
        order_items = self.get_initial_data()
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST)
        else:
            context['order_items'] = OrderItemInline(initial=order_items)
        context['order_items'].extra = len(order_items)
        context['empty_items'] = context['order_items'].empty_form
        context['fields'] = [
            {"id": "_id_status", "label": "Статус:", "value": order.get_status_display()},
            {"id": "_id_client", "label": "Клиент:", "value": order.client},
            {"id": "_id_manager", "label": "Менеджер:", "value": order.manager}
        ]
        return context
    
    def form_valid(self, form):
        context = self.get_context_data()
        order_items = context['order_items']
        try:

            with transaction.atomic():
                order_instance = form.save(commit=False)
                
                if not form.is_valid():
                    raise ValidationError(form.errors.as_text())    
                order_instance.save()

                for order_item in order_items:
                    if not order_item.is_valid():
                        raise ValidationError(order_item.errors.as_text())
                    
                    item_instance = order_item.save(commit=False)
                    item_instance.order = order_instance
                    item_instance.save()

        except ValidationError as error:
            transaction.rollback()
            context['errors'] = error.message
            return render(self.request, self.template_name, context)
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()

        return redirect('orders:orders')

    def get_initial_data(self):
        order_items = list(OrderItem.objects.filter(order_id=self.kwargs['order_id']).values())
        for order_item in order_items:
            order_item['product'] = get_object_or_404(Product, id=order_item['product_id'])
            order_item['size']    = None
            if order_item['size_id']:
                order_item['size']    = get_object_or_404(Size, id=order_item['size_id'])
            order_item = {
                key: value for key, value in order_item.items() if key not in [
                    'id','order_id'
            ]}

        return order_items


class ExportOrderView(TemplateView):
    template_name = 'forms/order.html'
    slug_url_kwarg, slug_field = 'order_id', 'pk'
    success_url = reverse_lazy('orders')

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        order_id = self.kwargs.get(self.slug_url_kwarg)
        order = get_object_or_404(Order, pk=order_id)
        context['order'] = order
        context['contact_detail'] = None
        with suppress(ContactDetail.DoesNotExist):
            contact_detail = ContactDetail.objects.get(client=order.client)
            context['contact_detail'] = contact_detail
        context['order_items'] = OrderItem.objects.filter(order=context['order'])
        context['order_totals'] = OrderItem.objects.filter(
            order=context['order']).aggregate(
                total_sum=Sum('sum'),
                total_discount=Sum('discount'),
                total_sum_without_discount=Sum(F('sum')-F('discount')),
                total_count=Count('pk')
            )

        return context


class ExportPDFView(ExportOrderView):

    def fetch_pdf_resources(self, uri, rel):
        path = None
        font_path = uri.replace(settings.STATIC_URL, '')
        if font_path:
            path = finders.find(font_path)

        return path

    def render_to_response(self, context, **response_kwargs):

        context = self.get_context_data()
        response = HttpResponse(content_type='application/pdf')

        # filename = f'Order-{context["order"].id}.pdf'
        # response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # template = get_template(self.template_name)
        # html_string = template.render(context)

        # pisa_status = pisa.CreatePDF(html_string, dest=response, link_callback=self.fetch_pdf_resources)

        # if pisa_status.err:
        #     return HttpResponse('Произошла ошибка при создании PDF', status=500)
    
        return response


class ExportXLSXView(ExportOrderView):

    def render_to_response(self, context, **response_kwargs):

        template = 'order_without _discounts.xlsx'
        context = self.get_context_data()
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

        filename = f'Order-{context["order"].id}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        save_xlsx(context, template, response)

        return response


def serialize_order_items(raw_order_items, clients):
    result = []
    for raw_item in raw_order_items:
        item = {
            'quantity': 1,
            'size': 0,
            'weight': 0.00,
            'price': 0.00,
            'unit': '796',
            'product': Product.objects.none,
            'total_price': 0.00
        }

        with suppress(Product.DoesNotExist, TypeError, ValueError):
            item['product']  = Product.objects.get(articul=raw_item[1])
            item['quantity'] = int(raw_item[2])
            if raw_item[3]:
                item['weight']   = float(raw_item[3])
            if raw_item[4]:
                item['size']     = raw_item[4]

            *_, prices, discount_prices = \
                StockAndCost.objects.available_stocks_and_costs(
                    [item['product'].pk,],
                    size=item['size'],
                    clients=clients
                )
            
            if prices:
                price_item = prices.first()
                item['price'] = price_item.price
                item['total_price'] = round(item['quantity'] * float(price_item.price), 2)
                if price_item.unit != '796' and raw_item[3]:
                    item['total_price'] = round(float(raw_item[3]) * float(price_item.price), 2)   


            result.append(item)

    return result


def import_xlsx(request):

    if request.method != 'POST':
        form = FileSelectionForm()
        return render(request, 'forms/file_selection.html', {'form': form})

    form = FileSelectionForm(request.POST, request.FILES)
    if not form.is_valid():
        return JsonResponse({'errors': form.errors.as_json()})
    
    login = Login(request)
    clients = login.get_clients()
    managers = login.get_managers()
    
    file = request.FILES['file_path']
    raw_order_items = read_xlsx(file)
    if not raw_order_items:
        return redirect('orders:orders')
    
    save_order(
        {
            'client': clients.first(),
            'manager': managers.first(),
            'status': 'introductory'
        },
        serialize_order_items(raw_order_items, clients)
    )

    return redirect('orders:orders')


@handle_errors()
@notification_scheduling(NotificationType.CONFIM_ORDER)
@notification_scheduling(NotificationType.GET_ORDER)
def schedule_send_order(order, *params):
    pass


def save_order(order_params, order_items):
    order_form = OrderForm(order_params)
    order_instance = order_form.save(commit=False)

    formset, errors = [], []
    try:
        with transaction.atomic():
            if order_form.is_valid():
                order_instance.save()

            for item in order_items:
                if item.get('total_price'):
                    formset.append(OrderItemForm(
                        item | {
                            'sum': item['total_price']
                    }))
                else:
                    formset.append(OrderItemForm(item))

            for form in formset:
                if not form.is_valid():
                    errors.append({
                        'product_id': item['product'].id,
                        'size': item['size'],
                        'error': form.errors.as_text()
                    })
                    continue
                item_instance = form.save(commit=False)
                item_instance.order = order_instance
                item_instance.save()

            if not order_items:
                transaction.rollback()
                raise ValidationError(
                    json.dumps([{
                        'product_id':-1, 'size':-1, 'error': 'there are no order items'
                }]))    

            if errors:
                transaction.rollback()
                raise ValidationError(json.dumps(errors))
    except:
        raise
    else:
        if transaction.get_autocommit():
            transaction.commit()
        return order_instance


def create_order(order_params, status, provision, order_items):
    context = {key: value for key, value in order_params.items()}
    context['status'] = status
    context['provision'] = provision
    return save_order(context, order_items)


def update_order(instance, order_params, order_items):

    def delete_instances():
        current_items = OrderItemInline(order_params, instance=instance)
        for current_item in current_items:
            current_item.instance.delete()

    order_form = OrderForm(order_params, instance=instance)
    order_instance = order_form.save(commit=False)

    formset, errors = [], []
    try:
        with transaction.atomic():
            delete_instances()
            if order_form.is_valid():
                order_instance.save()

            for item in order_items:
                if item.get('total_price'):
                    formset.append(OrderItemForm(
                        item | {
                            'sum': item['total_price']
                    }))
                else:
                    formset.append(OrderItemForm(item))

            for form in formset:
                if not form.is_valid():
                    errors.append({
                        'product_id': item['product'].id,
                        'size': item['size'],
                        'error': form.errors.as_text()
                    })
                    continue
                item_instance = form.save(commit=False)
                item_instance.order = order_instance
                item_instance.save()

            if not order_items:
                transaction.rollback()
                raise ValidationError(
                    json.dumps([{
                        'product_id':-1, 'size':-1, 'error': 'there are no order items'
                }]))    

            if errors:
                transaction.rollback()
                raise ValidationError(json.dumps(errors))
    
    finally:
        if transaction.get_autocommit():
            transaction.commit()


def remove_order(request, order_id):

    instance = get_object_or_404(Order,id=order_id)
    instance.delete()

    return redirect('orders:orders')


def edit_product(request, order_id, prod_id):

    def order_info(order_items):
        result = []
        for item in order_items:
            result.append({
                'product': Product.objects.filter(pk=item.product.id).values().first(),
                'unit': item.unit,
                'weight': item.weight,
                'size': item.size.name if item.size else '',
                'quantity': item.quantity,
                'price': item.price,
                'total_price': item.sum,
            })
        return result

    if request.method != 'POST':
        current_order = Order.objects.get(pk=order_id)
        order_items = OrderItem.objects.filter(order_id=order_id)
        current_item = OrderItem.objects.filter(order_id=order_id, product_id=prod_id).first()
        context = Product.objects.filter(pk=prod_id)
        return render(
            request,
            'forms/product_editing.html',
            {
                'object': context.first(),
                'items': json.dumps([
                    {**item, 'product': None} 
                    for item 
                    in order_info(order_items) 
                    if str(item['product']['id']) == prod_id
                ]),
                'is_sized': bool(StockAndCost.objects.filter(product_id=prod_id, size__isnull=False)),
                'stock_and_cost': StockAndCost.objects.filter(product_id=prod_id).order_by('size__size_from')
        })


@api_view(['GET'])
def add_order_item(request):
    order_id = request.query_params.get('order_id')

    if not order_id:
        return JsonResponse({'item_id': 0}, status=200)

    newOrderItem = OrderItem.objects.create(order=Order.objects.get(pk=order_id),)
    return JsonResponse({'item_id': newOrderItem.id}, status=200)


@api_view(['GET'])
def stocks_and_costs(request):
    order_id = request.query_params.get('orderId')
    if order_id:
        current_order = Order.objects.filter(pk=order_id)
        productIds = OrderItem.objects.filter(order_id=order_id).values_list('product_id', flat=True)

        _, products, stocks_and_costs, prices, discount_prices = \
            StockAndCost.objects.available_stocks_and_costs(
                productIds,
                clients=Login(request).get_clients()
            )
        
        stocks_and_costs_with_default_size = StockAndCost.objects.default_stocks_and_costs(
            products.values_list('pk', flat=True)
        )
        
        return JsonResponse(
            {
                'replay'           : 'ok',
                'order'            : serialize("json", current_order),
                'products'         : serialize("json", products),
                'stocks_and_costs' : serialize(
                    "json", stocks_and_costs, use_natural_foreign_keys=True
                ),
                'actual_prices'    : serialize("json", prices),
                'discount_prices'  : serialize("json", discount_prices),
                'default_sizes'    : serialize(
                    "json", stocks_and_costs_with_default_size, use_natural_foreign_keys=True
                ),
            },
            status=200,
            safe=False
        )

    return JsonResponse(
        {'replay': 'error', 'message': 'Отсутствуют Продукты для получения данных'},
        status=200
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unload_orders(request, *args, **kwargs):
    period = {}
    if kwargs.get('data_from'):
        period['created_at__gte'] = kwargs['data_from']
    if kwargs.get('data_to'):
        period['created_at__lte'] = kwargs['data_to']  
    serialized_orders = []
    for order in Order.objects.filter(status='confirmed', **period):
        serialized_order = json.loads(json.dumps(OrderSerializer(order).data))
        serialized_order['products'] = json.loads(
            json.dumps(
                OrderItemSerializer(OrderItem.objects.filter(order_id=order.id), many=True).data
        ))
        serialized_orders.append(serialized_order)

    return JsonResponse(serialized_orders, status=200, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def update_order_number(request):
    order_id = request.query_params.get('id')
    order_number = request.query_params.get('num')
    order_ident = request.query_params.get('ident')

    with suppress(ValidationError):
        if order_id and order_number and order_ident:
            order = Order.objects.filter(id=order_id).first()
            if not order:
                raise ValidationError   
            order.update(**{
                'num_in_1C': order_number,
                'identifier_1C': order_ident
            })
            schedule_send_order(order,)
        else:
            raise ValidationError
        return JsonResponse(
            {'replay': 'ok'},
            status=200,
            safe=False,
            json_dumps_params={'ensure_ascii': False}
        )

    return JsonResponse(
        {'replay': 'error', 'message': 'Не найден заказ'},
        status=200,
        safe=False,
        json_dumps_params={'ensure_ascii': False}
    )
    
    

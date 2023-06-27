from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.http import JsonResponse
from django.views.generic import ListView, UpdateView, CreateView
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view

from clients.login import Login
from catalog.models import Product
from orders.models import Order, OrderItem

from .forms import OrderItemInline


class OrderView(ListView):
    model = Order
    template_name = 'pages/orders.html'
    context_object_name = 'orders'
    allow_empty = True

    def get_queryset(self):
        login = Login(self.request)
        current_clients = login.get_clients()
        if not current_clients:
            return super().get_queryset()
        return Order.objects.filter(client__in=current_clients)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['order_items'] = OrderItem.objects.filter(order__in=context['orders'])
        return dict(list(context.items()))


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
            with transaction.atomic():
                form.instance.save()
                for order_item in order_items.deleted_forms:
                    order_item.instance.delete()
                order_items.save()

            return redirect('orders:orders')

        return render(self.request, self.template_name, context)


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
        order_items = self.get_initial_data()
        if self.request.POST:
            context['order_items'] = OrderItemInline(self.request.POST)
        else:
            context['order_items'] = OrderItemInline(initial=order_items)
        context['order_items'].extra = len(order_items)
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
            order_item = {
                key: value for key, value in order_item.items() if key not in [
                    'id','order_id'
            ]}

        return order_items


def remove_order(request, order_id):

    instance = get_object_or_404(Order,id=order_id)
    instance.delete()

    return redirect('orders:orders')


@api_view(['GET'])
def add_order_item(request):
    order_id = request.query_params.get('order_id')

    if not order_id:
        return JsonResponse({'item_id': 0}, status=200)

    newOrderItem = OrderItem.objects.create(order=Order.objects.get(pk=order_id),)
    return JsonResponse({'item_id': newOrderItem.id}, status=200)

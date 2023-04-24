from django.shortcuts import render
from django.views.generic import ListView, UpdateView, CreateView

from .models import (
    Product,
)


class ProductView(ListView):
    model = Product
    template_name = 'pages/products.html'
    context_object_name = 'products'
    allow_empty = True

    def get_queryset(self):
        return Product.objects.all()

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        return dict(list(context.items()))

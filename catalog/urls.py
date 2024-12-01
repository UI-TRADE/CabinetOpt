from django.urls import path

from . import views

app_name = "catalog"

urlpatterns = [
    path('filters/'                       , views.FiltersView.as_view()),
    path('products/'                      , views.ProductView.as_view(), name='products'),
    path('products/<str:key>/'            , views.ProductView.as_view()),
    # path('сertificates/'                  , views.CertificateView.as_view(), name='сertificates'),
    # path('services/'                      , views.ServiceView.as_view(), name='services'),
    path('product/<slug:prod_id>/'        , views.ProductCardView.as_view(), name='product'),
    path('upload/products'                , views.upload_products),
    path('remove/images/<slug:prod_id>'   , views.remove_images),
    path('upload/images'                  , views.upload_images),
    path('upload/videos'                  , views.upload_videos),
    path('upload/price'                   , views.upload_price),
    path('upload/stock_and_costs'         , views.upload_stock_and_costs),
    path('pickup_products/'               , views.pickup_products),
    path('stocks_and_costs/'              , views.stocks_and_costs),
    path('product/accessories'            , views.product_accessories),
    path('product/analogues'              , views.product_analogues),
    path('product/alike-products'         , views.alike_products),
    path('product/sizes/<slug:prod_id>/'  , views.sizes_selection, name='sizes_selection'),
    path('products/pages/count/'          , views.catalog_pages_count),
    path('search-error/'                  , views.search_error),
]

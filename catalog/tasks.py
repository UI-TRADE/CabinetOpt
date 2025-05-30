import io
import base64
import datetime
import six
import uuid

from contextlib import suppress
from django.db import transaction
from django.db.models import Q
from django.core.files.images import ImageFile
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.response import Response
from rest_framework.serializers import (
    ModelSerializer, ListSerializer, FileField
)

from clients.models import Client
from catalog.models import (
    СategoryGroup,
    Сategory,
    Product,
    ProductImage,
    ProductVideo,
    Brand,
    MetalFinish,
    StockAndCost,
    Size,
    GemSet,
    PreciousStone,
    CutType,
    Gender,
    Gift,
    Design,
    Style,
)
from catalog.models import PriceType, Price

class Base64FileField(FileField):
    
    def to_internal_value(self, data):
        if isinstance(data, six.string_types):
            if 'data:' in data and ';base64,' in data:
                header, data = data.split(';base64,')

            try:
                decoded_file = base64.b64decode(data)
            except TypeError:
                self.fail('invalid_file')

            file_name = str(uuid.uuid4())[:12]
            file_extension = self.get_file_extension(header)
            complete_file_name = f"{file_name}.{file_extension}"

            return ContentFile(decoded_file, name=complete_file_name)

        self.fail('invalid_file')

    def get_file_extension(self, header):
        if 'mp4' in header:
            return 'mp4'
        elif 'avi' in header:
            return 'avi'
        elif 'mkv' in header:
            return 'mkv'
        return 'bin'


class ProductSerializer(ModelSerializer):
    class Meta:
        model = Product
        fields = ['identifier_1C']


class ProductVideoListSerializer(ListSerializer):

    def get_product(self, data):
        product_data = dict(data.pop('product'))
        with suppress(Product.DoesNotExist):
            return Product.objects.get(
                identifier_1C=product_data.get('identifier_1C', '')
            )
        return Product.objects.none()

    def update(self, _, validated_data):
        ret = []
        for item in validated_data:
            product = self.get_product(item)
            product_video, _ = ProductVideo.objects.update_or_create(
                filename = item['filename'],
                defaults = item | {'product': product}
            )
            ret.append(product_video)

        return ret


class ProductVideoSerializer(ModelSerializer):

    product = ProductSerializer()
    video = Base64FileField()

    class Meta:
        model = ProductVideo
        fields = ['product', 'filename', 'video']
        list_serializer_class = ProductVideoListSerializer


def run_uploading_products(uploading_products):
    errors = []
    for item in uploading_products:
        try:
            with transaction.atomic():
                identifier_1C = item['nomenclature']['Идентификатор']
                product, _ = Product.objects.update_or_create(
                    identifier_1C=identifier_1C,
                    defaults = {
                        'name'               : item['nomenclature']['Наименование'],
                        'articul'            : item['articul'],
                        'сategory'           : update_or_create_category(item['collection'], item['group']),
                        'brand'              : update_or_create_brand(item['brand']),
                        'unit'               : item['unit'],
                        'available_for_order': True,
                        'product_type'       : item['product_type'],
                        "metal"              : item["metal"],
                        "metal_content"      : item["metal_content"],
                        "color"              : item["color"],
                        "status"             : item["status"],
                        'str_color'          : item["str_color"],
                        'lock_type_earings'  : item["lock_type_earings"],
                        'lock_type_chain'    : item["lock_type_chain"],
                        'lock_type_bracelet' : item["lock_type_bracelet"],
                        'chain_width'        : item["chain_width"],
                        'bracelet_width'     : item["bracelet_width"],
                        'q_borders_c_b'      : item["q_borders_c_b"],
                        'chain_weave'        : item["chain_weave"],
                        'bracelet_weave'     : item["bracelet_weave"],
                        'mark_description'   : item["mark_description"],
                        'show_on_site'       : bool(item["show_on_site"]),
                        'identifier_1C'      : identifier_1C
                })

                product.metal_finish.clear()
                processings = update_or_create_metal_finish(item["processing"])
                for type_of_metal_finish in processings:
                    if not type_of_metal_finish:
                        continue
                    product.metal_finish.add(type_of_metal_finish)

                product.gender.clear()
                genders = update_or_create_gender(item["gender"])
                for gender in genders:
                    if not gender:
                        continue
                    product.gender.add(gender)

                product.gift.clear()
                gifts = update_or_create_gift(item["gift"])
                for gift in gifts:
                    if not gift:
                        continue
                    product.gift.add(gift)

                product.style.clear()
                styles = update_or_create_style(item["style"])
                for style in styles:
                    if not style:
                        continue
                    product.style.add(style)

                product.design.clear()
                designs = update_or_create_design(item["design"])
                for design in designs:
                    if not design:
                        continue
                    product.design.add(design)

                GemSet.objects.filter(product=product).delete()
                if item.get('gem_sets'):
                    for gem_set in item['gem_sets']:
                        if not gem_set['precious_stone']:
                            raise PreciousStone.DoesNotExist
                        filter_kwargs = {'product': product}
                        filter_kwargs['size'] = update_or_create_size(gem_set['size_dop'])
                        precious_stone = update_or_create_precious_stone(gem_set['precious_stone'])
                        if precious_stone:
                            filter_kwargs['precious_stone'] = precious_stone    
                        cut_type = update_or_create_cut_type(gem_set['cut_type'])
                        if cut_type:
                            filter_kwargs['cut_type'] = cut_type
                        if gem_set['color']:
                            filter_kwargs['gem_color'] = gem_set['color']
                        if gem_set['weight']:
                            filter_kwargs['gem_weight'] = gem_set['weight']
                        if gem_set['quantity']:
                            filter_kwargs['gem_quantity'] = gem_set['quantity']
                        GemSet.objects.update_or_create(
                            **filter_kwargs,
                            defaults = {
                                'order'           : gem_set['order'],
                                'description'     : gem_set['description'],
                                'comment'         : gem_set['comment'],
                                'color_filter'    : gem_set['color_filter'],
                                'precious_filter' : gem_set['precious_filter'],
                            }
                        )

        except Exception as er:
            transaction.rollback()
            errors.append({
                'nomenclature': item['nomenclature']['Наименование'],
                'uuid': item['nomenclature']['Идентификатор'],
                "error": repr(er)
            })
            continue
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()
    
    return errors


def update_or_create_category_group(group):
    if not group:
        return
    
    group_obj = СategoryGroup.objects.filter(name=group.strip()).first()
    if not group_obj:   
        group_obj = СategoryGroup.objects.create(name=group.strip())

    return group_obj


def update_or_create_brand(brand):
    if not brand:
        return
    
    identifier_1C = brand['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return
    
    if brand['Удален']:
        found_brand = Brand.objects.get(identifier_1C=identifier_1C)
        found_brand.delete()
        return
    
    brand_obj, _ = Brand.objects.update_or_create(
        identifier_1C=identifier_1C,
        defaults={
            'name': brand['Наименование'].strip()
    })

    return brand_obj


def update_or_create_category(category, group):
    if not category:
        return

    identifier_1C = category['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return

    if category['Удален']:
        found_collecion = Сategory.objects.get(identifier_1C=identifier_1C)
        found_collecion.delete()
        return
    
    category_obj, _ = Сategory.objects.update_or_create(
        identifier_1C=identifier_1C,
        defaults={
            'name': category['Наименование'].strip(),
            'group': update_or_create_category_group(group)
    })

    return category_obj


def update_or_create_gender(genders):
    result = []
    for gender in genders:
        gender_obj, _ = Gender.objects.update_or_create(name=gender)
        result.append(gender_obj)

    return result


def update_or_create_metal_finish(processings):
    result = []
    for type_of_metal_finish in processings:
        metal_finish_obj, _ = MetalFinish.objects.update_or_create(name=type_of_metal_finish.strip())
        result.append(metal_finish_obj)

    return result


def update_or_create_gift(gifts):
    result = []
    for gift in gifts:
        gift_obj, _ = Gift.objects.update_or_create(name=gift)
        result.append(gift_obj)

    return result


def update_or_create_style(styles):    
    result = []
    for style in styles:
        design_obj, _ = Style.objects.update_or_create(name=style)
        result.append(design_obj)

    return result


def update_or_create_design(designs):    
    result = []
    for design in designs:
        design_obj, _ = Design.objects.update_or_create(name=design)
        result.append(design_obj)

    return result


def update_or_create_precious_stone(precious_stone):
    if not precious_stone:
        return
    
    precious_stone_obj, _ = PreciousStone.objects.update_or_create(name=precious_stone)

    return precious_stone_obj


def update_or_create_cut_type(cut_type):
    if not cut_type:
        return
    
    cut_type_obj, _ = CutType.objects.update_or_create(name=cut_type)
    return cut_type_obj


def run_uploading_images(uploading_images):
    for item in uploading_images:
        with transaction.atomic():
            identifier_1C = item['nomenclature']['Идентификатор']
            image_bytes = base64.b64decode(item['image'])
            image = ImageFile(io.BytesIO(image_bytes), name=item['filename'])
            
            with suppress(Product.DoesNotExist):
                product = Product.objects.get(identifier_1C=identifier_1C)
                ProductImage.objects.update_or_create(
                    product=product,
                    filename=item['filename'],
                    defaults={
                        'product': product,
                        'filename': item['filename'],
                        'order': item.get('order', 1),
                        'image': image
                })


def run_uploading_videos(request):
    serializer = ProductVideoSerializer(instance='', data=request.data, many=True)
    if serializer.is_valid(raise_exception=True):
        serializer.save()
        return Response('success upload', status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def run_uploading_price(uploading_price):
    errors = []
    for item in uploading_price:
        try:
            with transaction.atomic():
                price_type = PriceType.objects.get(name='Базовая')
                with suppress(KeyError):
                    if item['price_type']['Наименование'] == 'Выгода':
                        price_type = PriceType.objects.get(name='Выгода')
                    else:
                        price_type = update_or_create_price_type(item['price_type'])
                if not price_type:
                    raise ValidationError('error create price type')
                filter_kwargs = {
                    'type': price_type,
                    'product': Product.objects.get(
                        identifier_1C=item['nomenclature']['Идентификатор']
                    ),
                    'unit': item['unit']
                }
                defaults={'price': item['price']}

                begin_date = ''
                if item.get('begin_date'):
                    begin_date = f'{begin_date}{item.get("begin_date")}'
                if item.get('begin_time'):
                    begin_date = f'{begin_date} {item.get("begin_time")}'
                end_date = ''
                if item.get('end_date'):
                    end_date = f'{end_date}{item.get("end_date")}'
                if item.get('end_time'):
                    end_date = f'{end_date} {item.get("end_time")}'

                if begin_date:
                    defaults['start_at'] = datetime.datetime.strptime(begin_date, '%Y%m%d %H:%M:%S')
                if end_date:
                    defaults['end_at'] = datetime.datetime.strptime(end_date, '%Y%m%d %H:%M:%S')
                     
                Price.objects.update_or_create(**filter_kwargs, defaults=defaults)

        except Product.DoesNotExist:
            # transaction.rollback()
            errors.append({
                'nomenclature': item['nomenclature']['Наименование'],
                'uuid': item['nomenclature']['Идентификатор'],
                "error": f'Продукт с идентификатором {item["nomenclature"]["Идентификатор"]} не найден.'
            })
            continue

        except Exception as er:
            transaction.rollback()
            errors.append({
                'nomenclature': item['nomenclature']['Наименование'],
                'uuid': item['nomenclature']['Идентификатор'],
                "error": repr(er)
            })
            continue
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()
    
    return errors


def update_or_create_price_type(client):

    identifier_1C = client['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return
    
    found_client = Client.objects.filter(
        Q(inn__exact=client['ИНН'])|Q(name__icontains=client['Наименование'])
    ).first()

    if not found_client:
        raise Client.DoesNotExist

    filter_kwargs = {'client': found_client, 'name': client['Наименование']}
    price_type, _ = PriceType.objects.get_or_create(**filter_kwargs)
    return price_type


def update_or_create_size(size):
    if not size:
        return Size.objects.none().first()
    if not size['диапазон_от']:
        return Size.objects.none().first()

    defaults = {}
    defaults['size_from'] = size['диапазон_от']
    defaults['size_to']   = size['диапазон_от']
    if size['диапазон_до']:
        defaults['size_to'] = size['диапазон_до']

    size, _ = Size.objects.get_or_create(
        name=size['Наименование'].strip(),
        defaults=defaults
    )

    return size


def run_uploading_stock_and_costs(stock_and_costs):
    errors = []
    for item in stock_and_costs:
        try:
            with transaction.atomic():
                identifier_1C = item['nomenclature']['Идентификатор']
                product = Product.objects.get(identifier_1C=identifier_1C)
                filter_kwargs = {'product': product}
                filter_kwargs['size'] = None
                if item.get('size'):
                    filter_kwargs['size'] = update_or_create_size(item['size'])
                result, _ = StockAndCost.objects.update_or_create(
                    **filter_kwargs,
                    defaults = {
                        'weight': item['weight'],
                        'stock' : item['stock']
                    }
                )   

        except Product.DoesNotExist:
            errors.append({
                'nomenclature': item['nomenclature']['Наименование'],
                'uuid': item['nomenclature']['Идентификатор'],
                "error": f'Продукт с идентификатором {identifier_1C} не найден.'
            })
            continue

        except Exception as er:
            transaction.rollback()
            errors.append({
                'nomenclature': item['nomenclature']['Наименование'],
                'uuid': item['nomenclature']['Идентификатор'],
                "error": repr(er)
            })
            continue
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()
    
    return errors

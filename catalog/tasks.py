import io
import base64
import datetime
from contextlib import suppress
from django.db import transaction
from django.db.models import Q
from django.core.files.images import ImageFile
from django.core.exceptions import ValidationError

from clients.models import Client, PriorityDirection
from catalog.models import (
    Product,
    ProductImage,
    CollectionGroup,
    Collection,
    StockAndCost,
    Size,
    GemSet,
    PreciousStone,
    CutType,
    Gender,
    Gift,
    Design
)
from catalog.models import PriceType, Price


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
                        'collection'         : update_or_create_collection(item['collection'], item['group']),
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
                        'identifier_1C'      : identifier_1C
                })

                genders = update_or_create_gender(item["gender"])
                for gender in genders:
                    product.gender.add(gender)

                gifts = update_or_create_gift(item["gift"])
                for gift in gifts:
                    product.gift.add(gift)

                designs = update_or_create_design(item["design"])
                for design in designs:
                    product.design.add(design)

                if item.get('gem_sets'):
                    for gem_set in item['gem_sets']:
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
                        print(filter_kwargs)
                        GemSet.objects.update_or_create(
                            **filter_kwargs,
                            defaults = {
                                'order'           : gem_set['order'],
                                'description'     : gem_set['description'],
                                'comment'         : gem_set['comment']
                            }
                        )  

        except (KeyError, ValueError, Collection.DoesNotExist, PreciousStone.DoesNotExist) as error:
            transaction.rollback()
            errors.append(item | {"error": str(error)})
            continue
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()
    
    return errors


def update_or_create_collection_group(group):
    if not group:
        return
    
    group_obj, _ = CollectionGroup.objects.update_or_create(name=group)
    return group_obj


def update_or_create_brand(brand):
    if not brand:
        return
    
    identifier_1C = brand['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return
    
    if brand['Удален']:
        found_brand = PriorityDirection.objects.get(identifier_1C=identifier_1C)
        found_brand.delete()
        return
    
    brand_obj, _ = PriorityDirection.objects.update_or_create(
        identifier_1C=identifier_1C,
        defaults={
            'name': brand['Наименование']
    })

    return brand_obj


def update_or_create_collection(collection, group):
    if not collection:
        return

    identifier_1C = collection['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return
    
    if collection['Удален']:
        found_collecion = Collection.objects.get(identifier_1C=identifier_1C)
        found_collecion.delete()
        return
    
    collection_obj, _ = Collection.objects.update_or_create(
        identifier_1C=identifier_1C,
        defaults={
            'name': collection['Наименование'],
            'group': update_or_create_collection_group(group)
    })

    return collection_obj


def update_or_create_gender(genders):
    if not genders:
        return
    
    result = []
    for gender in genders:
        gender_obj, _ = Gender.objects.update_or_create(name=gender)
        result.append(gender_obj)

    return result


def update_or_create_gift(gifts):
    if not gifts:
        return
    
    result = []
    for gift in gifts:
        gift_obj, _ = Gift.objects.update_or_create(name=gift)
        result.append(gift_obj)

    return result


def update_or_create_design(designs):
    if not designs:
        return
    
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
                        'image': image
                })


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

 
        except (
            ValueError,
            Client.DoesNotExist,
            PriceType.DoesNotExist
        ) as error:
            transaction.rollback()
            errors.append(item | {"error": str(error)})
            continue

        except ValidationError as error:
            transaction.rollback()
            errors.append(item | {"error": error.message})
            continue

        except Product.DoesNotExist as error:
            transaction.rollback()
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
        return Size.objects.none()
    defaults = {}
    if size['диапазон_от']:
        defaults['size_from'] = size['диапазон_от']
        defaults['size_to']   = size['диапазон_от']
        if size['диапазон_до']:
            defaults['size_to'] = size['диапазон_до']
    size, _ = Size.objects.get_or_create(
        name=size['Наименование'],
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
                filter_kwargs['size'] = update_or_create_size(item['size'])
                result, _ = StockAndCost.objects.update_or_create(
                    **filter_kwargs,
                    defaults = {
                        'weight': item['weight'],
                        'stock' : item['stock']
                    }
                )

        except (KeyError, ValueError) as error:
            transaction.rollback()
            errors.append(item | {"error": str(error)})
            continue

        except Product.DoesNotExist:
            errors.append(item | {"error": f'Продукт с идентификатором {identifier_1C} не найден.'})
            continue
        
        finally:
            if transaction.get_autocommit():
                transaction.commit()
    
    return errors

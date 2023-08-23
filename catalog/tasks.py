import io
import base64
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
    CutType
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
                        'name'              : item['nomenclature']['Наименование'],
                        'articul'           : item['articul'],
                        'collection'        : update_or_create_collection(item['collection']),
                        'brand'             : update_or_create_brand(item['brand']),
                        'unit'              : item['unit'],
                        'available_for_order': True,
                        'product_type'       : item['product_type'],
                        "metal"              : item["metal"],
                        "metal_content"      : item["metal_content"],
                        "color"              : item["color"],
                        "gender"             : item["gender"],
                        "status"             : item["status"],
                        'identifier_1C'      : identifier_1C
                })

                if item.get('gem_sets'):
                    for gem_set in item['gem_sets']:
                        filter_kwargs = {'product': product}
                        precious_stone = update_or_create_precious_stone(gem_set['precious_stone'])
                        if precious_stone:
                            filter_kwargs['precious_stone'] = precious_stone    
                        cut_type = update_or_create_cut_type(gem_set['cut_type'])
                        if cut_type:
                            filter_kwargs['cut_type'] = cut_type
                        if gem_set['color']:
                            filter_kwargs['color'] = gem_set['color']
                        if gem_set['weight']:
                            filter_kwargs['weight'] = gem_set['weight']
                        if gem_set['quantity']:
                            filter_kwargs['quantity'] = gem_set['quantity']
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
    brand_obj, _ = PriorityDirection.objects.update_or_create(name=brand)
    return brand_obj


def update_or_create_collection(collection):
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
            'group': update_or_create_collection_group(collection['group']),
            'identifier_1C': identifier_1C
    })

    return collection_obj


def update_or_create_precious_stone(precious_stone):
    if not precious_stone:
        return

    identifier_1C = precious_stone['Идентификатор']
    if identifier_1C == '00000000-0000-0000-0000-000000000000':
        return
    
    if precious_stone['Удален']:
        found_precious_stone = PreciousStone.objects.get(identifier_1C=identifier_1C)
        found_precious_stone.delete()
        return
    
    precious_stone_obj, _ = PreciousStone.objects.update_or_create(
        identifier_1C=identifier_1C,
        defaults={
            'name': precious_stone['Наименование'],
            'identifier_1C': identifier_1C
    })

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
                Price.objects.update_or_create(**filter_kwargs, defaults={'price': item['price']})

 
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


def run_uploading_stock_and_costs(stock_and_costs):
    errors = []
    for item in stock_and_costs:
        try:
            with transaction.atomic():
                identifier_1C = item['nomenclature']['Идентификатор']
                product = Product.objects.get(identifier_1C=identifier_1C)
                filter_kwargs = {'product': product}
                if item['size']:
                    defaults = {}
                    if item['size']['диапазон_от']:
                        defaults['size_from'] = item['size']['диапазон_от']
                        defaults['size_to']   = item['size']['диапазон_от']
                        if item['size']['диапазон_до']:
                            defaults['size_to'] = item['size']['диапазон_до']
                    size, _ = Size.objects.get_or_create(
                        name=item['size']['Наименование'],
                        defaults=defaults
                    )
                    filter_kwargs['size'] = size
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

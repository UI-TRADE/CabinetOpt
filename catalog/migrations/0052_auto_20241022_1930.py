# Generated by Django 4.1.7 on 2024-10-22 16:30

from django.db import migrations

def copy_collections(apps, schema_editor):

    Сategory = apps.get_model("catalog", "Сategory")
    Product = apps.get_model("catalog", "Product")

    qs = Product.objects.all()
    for obj in qs:
        if not obj.collection:
            continue
        obj.сategory = Сategory.objects.get(
            identifier_1C=obj.collection.identifier_1C
        )
        obj.save()

class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0051_alter_сategory_options_alter_сategorygroup_options_and_more'),
    ]

    operations = [
        migrations.RunPython(copy_collections),
    ]

import pymorphy2
from nameparser import HumanName


def parse_of_name(name):
    morph = pymorphy2.MorphAnalyzer()

    if name:
        parsed_name = HumanName(name)

        # приводим к именительному падежу
        last_name  = morph.parse(parsed_name.last)[0].normal_form.title()
        first_name = morph.parse(parsed_name.first)[0].normal_form.title()
        patronymic = morph.parse(parsed_name.middle)[0].normal_form.title()

        return {
            'last_name': last_name,
            'first_name': first_name,
            'surname': patronymic
        }

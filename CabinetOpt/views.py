from django.shortcuts import render


def custom_404_handler(request, exception):
    return render(request=request, template_name='components/errors/404.html', status=404, context={
        'title': 'Страница не найдена: 404',
        'error_message': 'Страницы по данной ссылке не существует. Перейдите в «Каталог». Или воспользуйтесь фильтром.', 
    })

def custom_500_handler(request):
    import pdb; pdb.set_trace()
    return render(request=request, template_name='components/errors/500.html', status=404, context={
        'title': 'Ошибка на сервере: 500',
        'error_message': 'Мы уже работаем над ее устранением. Перейдите в «Каталог».', 
    })


def custom_403_handler(request, exception):
    return render(request=request, template_name='components/errors/403.html', status=404, context={
        'title': 'Ошибка проверки подлинности: 403',
        'error_message': 'Обновите страницу и попробуйте заново.', 
    })


def forbidden_view(request):
    return render(request=request, template_name='components/errors/403.html', status=404, context={
        'title': 'Ошибка проверки подлинности: 403',
        'error_message': 'Обновите страницу и попробуйте заново.', 
    })

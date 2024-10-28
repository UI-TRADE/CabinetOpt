from django.shortcuts import render


def custom_404_handler(request, exception):
    return render(request=request, template_name='components/errors/404.html', status=404, context={
        'title': 'Страница не найдена: 404',
        'error_message': 'Страницы по данной ссылке не существует. Перейдите в «Каталог».', 
    })

def custom_500_handler(request):
    if request.path.startswith('/admin'):
        return render(request=request, template_name='admin/errors/500.html', status=500, context={
            'title': 'Ошибка на сервере: 500',
            'error_message': 'Мы уже работаем над ее устранением.', 
        })
    else:
        return render(request=request, template_name='components/errors/500.html', status=500, context={
            'title': 'Ошибка на сервере: 500',
            'error_message': 'Мы уже работаем над ее устранением. Перейдите в «Каталог».', 
        })


def custom_403_handler(request, exception):
    return render(request=request, template_name='components/errors/403.html', status=403, context={
        'title': 'Ошибка проверки подлинности: 403',
        'error_message': 'Обновите страницу и попробуйте заново.', 
    })


def forbidden_view(request):
    return render(request=request, template_name='components/errors/403.html', status=403, context={
        'title': 'Ошибка проверки подлинности: 403',
        'error_message': 'Обновите страницу и попробуйте заново.', 
    })

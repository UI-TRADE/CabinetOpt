import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery-ui-dist/jquery-ui.css';
import generateUUID from './lib';
import mainMenuEvents from './main_menu';
import updateContactView, {contactEvents} from './contact';
import { cartViewEvents } from './cart';
import initProductFilters, { filtersEvents } from './catalog/filters';
import updateProductCard, { productCardEvents } from './catalog_card';
import ordersEvents from './orders';
import orderEvents from './order';
import showModalForm, {
    modalFormEvents,
    switchModalForm,
    showChangePassForm,
    showAuthForm,
    updateModalForm,
    applyShowPasswordButtons,
    bindEventToCaptcha
} from './form';

// import updateOrder from '../js/_old/order';


require('jquery-ui');


const initStorages = () => {
    if (localStorage.getItem('cartView') === null)
        localStorage.setItem('cartView', false);
    if (sessionStorage.getItem('filters') === null)
        sessionStorage.setItem('filters', JSON.stringify([]));
    if (!localStorage.getItem('client_id'))
        localStorage.setItem('client_id', generateUUID());
}


const addEvents = () => {

    modalFormEvents();
    mainMenuEvents();
    filtersEvents();
    productCardEvents();
    cartViewEvents();
    ordersEvents();
    orderEvents();
    contactEvents();

}


$(window).on("load", () => {

    initStorages();

    const selectedURI = sessionStorage.getItem('selectedURI');
    if (selectedURI) {
        const mainMenuItems = document.getElementsByClassName('main__menu__item');
        for (var i=0; i < mainMenuItems.length; i++) {
            if (mainMenuItems[i].getAttribute('data-url') == selectedURI) {
                mainMenuItems[i].classList.add('main__menu__item--selected');
                continue;
            }
            if (mainMenuItems[i].classList.contains('main__menu__item--selected')) {
                mainMenuItems[i].classList.remove('main__menu__item--selected');
            }
        }
    }

    // Очищаем список выбора скрытого поля product, за исключением выбранного значения
    const orderFields = document.getElementsByClassName('order__field__product');
    for(var i=0; i<orderFields.length; i++) {
        const fieldOptions = orderFields[i].querySelectorAll('*');
        for(var j=0; j<fieldOptions.length; j++) {
            if (!fieldOptions[j].selected) {
                fieldOptions[j].parentNode.removeChild(fieldOptions[j]);
            }
        }
    }

});


$(document).ready(() => {

    $('#add-to-favorites').on('click', _ => {
        if(window.sidebar)
            window.sidebar.addPanel(location.href,document.title, '');
        else {
            if(window.external && ('AddFavorite' in window.external))
                window.external.AddFavorite(location.href,document.title);
            else
                alert('Браузер не потдерживает добавление, нажмите CTRL + D для добавления в ручную!');
        }   
    });

    if (window.location.pathname.indexOf('clients/recovery_pass') !== -1) {
        const $modal = $('#change-pass-form');
        applyShowPasswordButtons($modal);
        bindEventToCaptcha('change-pass-form');
        updateModalForm('change-password-form');
        document.getElementsByTagName("html")[0].style.visibility = "visible";
        return;
    }

    if (window.location.pathname.indexOf('clients/change_pass') !== -1) {
        const $modal = $('#change-pass-form');
        applyShowPasswordButtons($modal);
        bindEventToCaptcha('change-pass-form');
        updateModalForm('change-password-form');
        document.getElementsByTagName("html")[0].style.visibility = "visible";
        return;
    }

    if (window.location.pathname.indexOf('clients/request_pass') !== -1) {
        document.getElementsByTagName("html")[0].style.visibility = "visible";
        return;
    }

    $.ajax({
        url: '/clients/check_login',
        success: (response) => {

            if (response.replay === 'fail') {
                if (window.location.pathname !== '/') {
                    window.location.replace('/');
                    return
                }

                // login
                const mainAuthForm = 'registration-form';
                const auth = sessionStorage.getItem('auth') || 'reg_request';
                showAuthForm(generateUUID(), auth);
                switchModalForm('entry', mainAuthForm, generateUUID());
                switchModalForm('register', mainAuthForm, generateUUID());
                sessionStorage.removeItem('auth');
            }

            if (response.replay === 'ok') {
                if (window.location.pathname === '/') {
                    window.location.replace('/catalog/products/');
                    return
                }
            }

            showChangePassForm();
            updateContactView('contactForm');
            initProductFilters();
            updateProductCard();
            addEvents();
            document.getElementsByTagName("html")[0].style.visibility = "visible";
            $(document).trigger('cart.updated', {});

        },
        error: (xhr, status, error) => {
            handleError(error, 'Ошибка получения данных аутентификации с сервера.');
        }
    });

})


import '../scss/main.scss';
import '../css/filters.css';
import '../scss/autocomplete.scss';
import '../scss/index.scss';

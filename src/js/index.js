import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery-ui-dist/jquery-ui.css';
import generateUUID from './lib';
import mainMenuEvents from './main_menu';
import updateContactView, {contactEvents} from './contact';
import { cartViewEvents } from './cart';
import initProductFilters, { filtersAndSortingEvents } from './catalog/filters';
import updateProductCard, { productCardEvents } from './catalog_card';
import ordersEvents from './orders';
import orderEvents from './order';
import showAuthForm, {
    modalFormEvents,
    switchModalForm,
    showChangePassForm,
    updateModalForm,
    applyShowPasswordButtons,
    bindEventToCaptcha
} from './form';
import * as ymaps3 from 'ymaps3';

// import updateOrder from '../js/_old/order';


require('jquery-ui');
import 'slick-carousel'


const initStorages = () => {
    if (localStorage.getItem('cartView') === null)
        localStorage.setItem('cartView', false);
    if (!localStorage.getItem('client_id'))
        localStorage.setItem('client_id', generateUUID());

    if (sessionStorage.getItem('filters') === null)
        sessionStorage.setItem('filters', JSON.stringify([]));
    if (sessionStorage.getItem('sorting') === null)
        sessionStorage.setItem('sorting', JSON.stringify({}));

    const segments = window.location.pathname.split('/').filter(segment => segment.length > 0);
    return $.ajax({url: `/shared_links/${segments.slice(-1).find(_ => true)}`});
}


const addEvents = () => {

    modalFormEvents();
    mainMenuEvents();
    filtersAndSortingEvents();
    productCardEvents();
    cartViewEvents();
    ordersEvents();
    orderEvents();
    contactEvents();

}

async function initMap() {
    await ymaps3.ready;
    const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker} = ymaps3;
  
    const map = new YMap(
        document.getElementById('where-to-buy'),
        {
            location: {
                center: [40.996244, 57.760530],
                zoom: 6
            },
            searchControlProvider: 'yandex#search',
            showScaleInCopyrights: true
        }
    );
  
    map.addChild(new YMapDefaultSchemeLayer());
    map.addChild(new YMapDefaultFeaturesLayer());

    const markers = [
        [30.328750, 59.981267],
        [49.140685, 55.742225],
        [40.996244, 57.760530]
    ];

    markers.forEach((coordinate) => {
        // Создание маркера
        const el = document.createElement('img');
        el.className = 'map-marker';
        el.src = "/static/img/map-icon.svg";
        el.title = '';
        el.onclick = () => map.update({
            location: {
                center: coordinate,
                zoom: 13
            }
        });

        // Создание заголовка маркера
        const markerTitle = document.createElement('div');
        markerTitle.className = 'marker-title';
        markerTitle.innerHTML = '';

        // Контейнер для элементов маркера
        const imgContainer = document.createElement('div');
        imgContainer.appendChild(el);
        imgContainer.appendChild(markerTitle);

        map.addChild(new YMapMarker({coordinates: coordinate}, imgContainer));

    });

  }


$(window).on("load", () => {

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

    $.when(initStorages())
    .then(response => {
        if ('replay' in response && response.replay !== 'error') {
            if ('filters' in response)
                sessionStorage.setItem('filters', response.filters);
            if ('sorting' in response)
                sessionStorage.setItem('sorting', response.sorting);
            // window.location.replace(response.path);
            window.history.pushState({}, "", response.path);
        }
    })
    .always(() => {

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
                initMap();
                document.getElementsByTagName("html")[0].style.visibility = "visible";
                $(document).trigger('cart.updated', {});

            },
            error: (xhr, status, error) => {
                handleError(error, 'Ошибка получения данных аутентификации с сервера.');
            }
        });

    });

});


import '../scss/main.scss';
import '../css/filters.css';
import '../scss/autocomplete.scss';
import '../scss/index.scss';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery-ui-dist/jquery-ui.css';
import generateUUID from './lib';
import mainMenuEvents from './main_menu';
import showModalForm, {modalFormEvents, switchModalForm, showChangePassForm, showAuthForm} from './form';
import updateContactView, {contactEvents} from './contact';
import { cartViewEvents } from './cart';
import initProductFilters, { filtersEvents } from './catalog/filters';
import updateProductCard from './catalog_card';
import ordersEvents from './orders';
import orderEvents from './order';
// import updateOrder from '../js/_old/order';


require('jquery-ui');


const addEvents = () => {

    modalFormEvents();
    mainMenuEvents();
    filtersEvents();
    cartViewEvents();
    ordersEvents();
    orderEvents();
    contactEvents();

}


$(window).on("load", () => {
    if (localStorage.getItem('cartView') === null)
        localStorage.setItem('cartView', false);
    if (sessionStorage.getItem('filters') === null)
        sessionStorage.setItem('filters', JSON.stringify([]));

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

    if (window.location.pathname == '/') {
        // login
        const mainAuthForm = 'registration-form';
        const auth = sessionStorage.getItem('auth') || 'reg_request';
        console.log(sessionStorage);
        showAuthForm(generateUUID(), auth);
        switchModalForm('entry', mainAuthForm, generateUUID());
        switchModalForm('register', mainAuthForm, generateUUID());
        sessionStorage.removeItem('auth');
        console.log(sessionStorage);
    }

    // change pass
    showChangePassForm();

    // file selection
    // showModalForm('fileSelectionForm');

    // forms
    updateContactView('contactForm');

    // products
    initProductFilters();
    updateProductCard();

    // НЕ ИСПОЛЬЗУЕТСЯ
    // updateOrder()

    // events
    addEvents();

})


import '../scss/main.scss';
import '../css/filters.css';
import '../scss/autocomplete.scss';
import '../scss/index.scss';

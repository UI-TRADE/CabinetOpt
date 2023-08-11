import mainMenuEvents from './main_menu';
import showModalForm from './form';
import updateContactView from './contact';
import updateCartView, {cartViewEvents} from './cart';
import initProductFilters, {catalogEvents} from './catalog_filters';
import updateProductCard from './catalog_card';
import ordersEvents from './orders';
import orderEvents, {updateOrder} from './order';


const addEvents = () => {

    mainMenuEvents();
    cartViewEvents();
    catalogEvents();
    ordersEvents();
    orderEvents();

}


$(window).on("load", () => {
    if (localStorage.getItem('cartView') === null) 
        localStorage.setItem('cartView', false);
    if (localStorage.getItem('excludedВrands') === null) 
        localStorage.setItem('excludedВrands', new Array());
    if (localStorage.getItem('excludedCollection') === null) 
        localStorage.setItem('excludedCollection', new Array());
    if (sessionStorage.getItem('filters') === null) 
        sessionStorage.setItem('filters', JSON.stringify({}));

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
        fieldOptions = orderFields[i].querySelectorAll('*');
        for(var j=0; j<fieldOptions.length; j++) {
            if (!fieldOptions[j].selected) {
                fieldOptions[j].parentNode.removeChild(fieldOptions[j]);
            }
        }    
    }

});


$(document).ready(() => {
    // login
    showModalForm('loginForm'); 
    showModalForm('regRequestForm');

    // file selection
    showModalForm('fileSelectionForm');

    // forms
    updateContactView('contactForm');
    updateCartView('cartView');

    // products
    initProductFilters();
    updateProductCard();

    // orders
    updateOrder()

    // events
    addEvents();
})

import '../css/index.css';

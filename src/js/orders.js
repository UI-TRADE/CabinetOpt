import {loadOrder, initOrderInfo} from './order';
import { createSpiner, removeSpiner } from './lib';


function ordersEvents() {
    // $('.order-row').click((event) => {
    //     window.document.location = event.currentTarget.dataset.href
    // });

    var orderRequest = undefined;
    const $orderListLinks = $('.order-item__title, .order-item__edit-button a', $('.order-list'));
    $orderListLinks.on('click', (event) => {
        event.preventDefault();
        $orderListLinks.removeClass('active');
        event.currentTarget.classList.add('active');
        if(orderRequest) orderRequest.abort();
        const orderItemId = event.currentTarget.parentElement.id?.replace('order-status-', 'order-item-');
        const currentSpin = createSpiner($('.main-content')[0]);
        orderRequest = loadOrder($(event.currentTarget).attr("href"));
        orderRequest
            .then(html => {
                const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                $(DOMModel.querySelector(`#${orderItemId}`)).appendTo($("#order").empty())
                initOrderInfo();
                removeSpiner(currentSpin);
            })
            .catch((error) => {
                removeSpiner(currentSpin);
                handleError(error, 'Ошибка чтения заказа');
            });
    }).first().trigger('click');

    const orderBoxToggler = document.getElementsByClassName('order-box');
    for (var i = 0; i < orderBoxToggler.length; i++) {
        orderBoxToggler[i].addEventListener('click', (event) => {
            const order_id = event.target.id.replace(/[^\d.]/g, '');;
            if (order_id) {
                document.querySelector(`#order-nested-${order_id}`)?.classList.toggle('order-active');
                event.target.classList.toggle('order-open-box');
            }
        });
    }
}

export default ordersEvents;

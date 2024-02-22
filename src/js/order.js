import updateProductCard from './catalog_card';
import {updateTotalSizeInfo, addSelectionSizesEvents, addSizeSlider} from './cart';
import { createSpiner, removeSpiner } from './lib';
import { weightFormat } from "./utils/weight_format";
import { decimalFormat } from "./utils/money_format";
import { handleError } from "./utils/exceptions";
// import updateOrder from '../js/_old/order';


const closeProductEditingWindow = () => {
    const $card = $('.product-editing');
    const $overlay = $('.background-overlay');
    $card.html('');
    $card.addClass('hidden');
    $overlay.addClass('hidden');
    $overlay.off();
}


const disableSizeSlider = (sizeForm) => {
    const $inputs = $('input[name="sizes-selection-quantity-input"]', sizeForm);
    $.each($inputs, (_, item) => {
        $(item).prop('disabled', true);
    });

    const $incrementButtons = $('button[name="sizes-selection-quantity-increment"]', sizeForm);
    $.each($incrementButtons, (_, item) => {
        $(item).prop('disabled', true);
    });

    const $decrementButtons = $('button[name="sizes-selection-quantity-decrement"]', sizeForm);
    $.each($decrementButtons, (_, item) => {
        $(item).prop('disabled', true);
    });
}


export const initOrderInfo = () => {
    const orderTableItems = $('#order-items');

    if(orderTableItems.length) {
        orderTableItems.tablesorter({
            textExtraction: {
                '.articul' : function(node, table, cellIndex) {
                    return "#"  + $(node).text();
                },
                '.quantity' : function(node, table, cellIndex) {
                    return $(node).find("input").val();
                }
            }
        })
    }
    orderEvents()
    //НЕ ИСПОЛЬЗУЕТСЯ
    //updateOrder()
}


const updateOrderView = (url, url_get, orderComponent, status=undefined, reload=false) => {
    const $form = $('#orderForm');
    const formData = new FormData($form[0]);
    const orderId = orderComponent.attr('data-id');

    if (status)
        formData.set('status', status);

    const currentSpin = createSpiner($('.main-content')[0]);
    $.ajax({
        type: 'POST',
        url: (url) ? url : $form.attr('action'),
        data: formData,
        processData: false,
        contentType: false,
        success: (_) => {
            if (reload) 
                location.reload();
            else {
                loadOrder(url_get).then(html => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    initOrderInfo();
                    $(document).trigger("order.updated");
                    removeSpiner(currentSpin);
                });
            }
        },
        error: (error) => {
            removeSpiner(currentSpin);
            handleError(error, 'Ошибка отправки заказа в Talant');
        }
    });

}


const updateOrderItemForm = (itemElement, quantity, weight, sum) => {
    const formElementQuantity = itemElement?.find('input[name$="-quantity"]');
    const formElementSum = itemElement?.find('input[name$="-sum"]');
    formElementQuantity.val(quantity).trigger('change');
    formElementSum.val(sum).trigger('change');
}


const updateViewItemForm = (itemElement, quantity, weight, sum) => {
    const elementOfWeight = itemElement?.find('td[name="cart-mass"]');
    const elementOfSum = itemElement?.find('td[name="cart-sum"]');
    elementOfWeight.text(weightFormat(weight, 2));
    elementOfSum.text(`${Math.round(sum).toLocaleString()} р.`);
}


const updateTotalOrderData = () => {

    let quantity = 0, weight = 0, sum = 0;

    const totalQuantity = $('div[class="order-item-result__total-count"]', $('#orderForm'));
    const totalWeight = $('div[class="order-item-result__total-weight"]', $('#orderForm'));
    const totalPrice = $('div[class="order-item-result__total-price"]', $('#orderForm'));

    const $lines = $('tr[class="order-product-item"]', $('#orderForm'));
    $.each($lines, (_, line) => {
        quantity += Number($('input[name$="-quantity"]', line).val());
        weight += parseFloat($('input[name$="-weight"]', line).val()) 
            * Number($('input[name$="-quantity"]', line).val());
        sum += parseFloat($('input[name$="-sum"]', line).val());
    });

    totalQuantity.text(`${quantity} шт`);
    totalWeight.text(`${weightFormat(weight, 2)} гр`);
    totalPrice.text(`${Math.ceil(sum).toLocaleString()} р`);

}


const getItemID = (item) => {
    const el = $('input[name$="-nomenclature"]', item);
    if (!el) return -1;
    const match = el.attr('name')?.match(/items-(\d+)-nomenclature/);
    if (match) return match[1];
}


function editOrder(){
    const $form = $('#orderForm');
    const $url = $form.attr('action').replace('update', 'edit').replace('split', 'edit');
    return $.ajax({
        url: $url,
        method: "post",
        data: $form.serialize(),
        succes: (response) => {
            $(document).trigger("order.updated", response);
            return response;
        },
        error: (error) => {
            handleError(error, 'Ошибка записи заказа');
        }
    });
}


export function loadOrder(orderLink){
    return $.ajax({
        url: orderLink,
        method: "get",
    })
}


export function orderEvents() {
    const orderForm = $("#orderForm");

    $(`#sendTalant`).on('click', (event) => {
        const orderId = $(event.target).attr('data-id');
        const link = $(`#order-status-${orderId}`).find('a');
        updateOrderView('', link.attr('href'), $(event.target), 'confirmed', true);
    });

    $(`#saveOrder`).on('click', (event) => {
        const currentSpin = createSpiner($('.main-content')[0]);
        const orderId = $(event.target).attr('data-id');
        editOrder()
            .then((_) => {
                const $url = $('#orderForm').attr('action').replace('update', 'edit').replace('split', 'edit');
                const orderRequest = loadOrder($url);
                orderRequest.then((html) => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    initOrderInfo();
                    $(document).trigger("order.updated");
                    removeSpiner(currentSpin);
                });
            })
            .catch((error) => {
                removeSpiner(currentSpin);
                handleError(error, 'Ошибка записи заказа');
            });
    });

    $(`#closeOrder`).on('click', (event) => {
        const redirect_url = event.target.getAttribute("data-url");
        document.location.href = redirect_url;
    });

    $('input[name="quantity"]', orderForm).on('change', (event) => {
        const viewElement = $(event.currentTarget);
        const currentLine = viewElement.parents('tr');
        const quantity = parseInt(viewElement.val());
        const weight = parseFloat(currentLine?.find('input[name$="-weight"]').val());
        const price = parseFloat(currentLine?.find('input[name$="-price_per_gr"]').val());
        const currentWeight = (quantity * weight);
        const currentSum = (quantity * (weight * price).toFixed());
        updateOrderItemForm(currentLine, quantity, currentWeight, currentSum);
        updateViewItemForm(currentLine, quantity, currentWeight, currentSum);
        updateTotalOrderData();
    });

    $('.add-quantity', orderForm).on('click', (event) => {
        event.preventDefault();
        const currentId = $(event.currentTarget).attr("href");

        const viewElement = $(currentId);
        const quantity = parseInt(viewElement.val()) + 1;
        viewElement.val(quantity);

        const currentLine = viewElement.parents('tr');
        const weight = parseFloat(currentLine?.find('input[name$="-weight"]').val());
        const price = parseFloat(currentLine?.find('input[name$="-price_per_gr"]').val());
        const currentWeight = (quantity * weight);
        const currentSum = (quantity * (weight * price).toFixed(2));

        updateOrderItemForm(currentLine, quantity, currentWeight, currentSum);
        updateViewItemForm(currentLine, quantity, currentWeight, currentSum);
        updateTotalOrderData();
    });

    $('.remove-quantity', orderForm).on('click', (event) => {
        event.preventDefault();
        const currentId = $(event.currentTarget).attr("href");

        const viewElement = $(currentId);
        const quantity = parseInt(viewElement.val()) - 1; if (quantity === 0) return;
        viewElement.val(quantity);

        const currentLine = viewElement.parents('tr');
        const weight = parseFloat(currentLine?.find('input[name$="-weight"]').val());
        const price = parseFloat(currentLine?.find('input[name$="-price_per_gr"]').val());
        const currentWeight = (quantity * weight);
        const currentSum = (quantity * (weight * price).toFixed(2));

        updateOrderItemForm(currentLine, quantity, currentWeight, currentSum);
        updateViewItemForm(currentLine, quantity, currentWeight, currentSum);
        updateTotalOrderData();
    });

    $('[name="remove-item"]', orderForm).on('click', event => {
        event.preventDefault();
        const link = $(event.currentTarget).parents('tr');
        const item = link?.find('input[name$="DELETE"]');
        if (item)
            item.prop('checked', true);
            link.addClass('hidden');
    });

    $("#orderForm").find('tr').each((_, item) => {
        $('a[name="edit"]', item).on('click', (event) => {
            event.preventDefault();
            const itemID = getItemID(item);
            const itemNum = $(item).attr('data-id');
            const formData = $('#orderForm').serializeArray();
            let product_id = 0; let unit = '163'; let price = 0;
            if (itemID != -1) {
                formData.forEach(el => {
                    if (el['name'] == `items-${itemID}-product`)
                        product_id = el['value'];
                    if (el['name'] == `items-${itemID}-unit`)
                        unit = el['value'];
                    if (el['name'] == `items-${itemID}-price_per_gr`)
                        price = el['value'];
                });
            }

            $('.background-overlay').removeClass('hidden');
            const $modal = $(`#product-editing-form-${itemNum}`, '#orderForm');
            const currentUrl = $modal.attr('data-url');
            if (currentUrl) {
                $.ajax({
                    url: currentUrl,
                    success: (data) => {
                        const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
                        let currentForm = reloadHtml.querySelector('main[name="main"]');
                        $modal.html(currentForm.outerHTML);
                        updateProductCard();
                        updateTotalSizeInfo(product_id, price, unit);
                        addSelectionSizesEvents(product_id, price, unit);
                        addSizeSlider($modal, 6);
                        disableSizeSlider($modal);
                        $('.background-overlay').click(closeProductEditingWindow);
                    },
                    error: (xhr, status, error) => {
                        handleError(error, 'Ошибка открытия формы');
                    }
                });        
            }
            $modal.removeClass('hidden');
            return;
        });
    });

}


export default orderEvents;

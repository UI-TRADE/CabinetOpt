import updateProductCard from './catalog_card';
import {updateTotalSizeInfo, addSelectionSizesEvents, addSizeSlider} from './cart';
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
                });
            }
        },
        error: (error) => {
            alert('Ошибка отправки заказа в Talant: ' + error);
        }
    });

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
            alert(`Ошибка записи заказа ${error}`);
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
    const orderForm = $("#orderForm")

    $(`#sendTalant`).on('click', (event) => {
        const orderId = $(event.target).attr('data-id');
        const link = $(`#order-status-${orderId}`).find('a');
        updateOrderView('', link.attr('href'), $(event.target), 'confirmed', true);
    });

    $(`#closeOrder`).on('click', (event) => {
        const redirect_url = event.target.getAttribute("data-url");
        document.location.href = redirect_url;
    });

    $('input[name="quantity"]', orderForm).on('change', (event) => {
        const orderId = $('#order').children().attr('data-id');
        const viewElement = $(event.currentTarget);
        const currentLine = viewElement.parents('tr');
        const formElementQuantity = currentLine?.find('input[name$="-quantity"]');
        const formElementSum = currentLine?.find('input[name$="-sum"]');
        const newVal = parseInt(viewElement.val());
        const newSum = (newVal * parseFloat(currentLine?.find('input[name$="-price"]').val())).toFixed(2);
        formElementQuantity.val(newVal).trigger('change');
        formElementSum.val(newSum).trigger('change');
        editOrder()
            .then((_) => {
                const $url = $('#orderForm').attr('action').replace('update', 'edit').replace('split', 'edit');
                const orderRequest = loadOrder($url);
                orderRequest.then((html) => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    initOrderInfo();
                    $(document).trigger("order.updated")
                });
            })
    });

    $('.add-quantity', orderForm).on('click', (event) => {
        const orderId = $('#order').children().attr('data-id');
        const viewElement = $($(event.currentTarget).attr("href"));
        const currentLine = viewElement.parents('tr');
        const formElementQuantity = currentLine?.find('input[name$="-quantity"]');
        const formElementSum = currentLine?.find('input[name$="-sum"]');
        const newVal = parseInt(viewElement.val()) + 1;
        const newSum = (newVal * parseFloat(currentLine?.find('input[name$="-price"]').val())).toFixed(2);
        formElementQuantity.val(newVal).trigger('change');
        formElementSum.val(newSum).trigger('change');
        editOrder()
            .then((_) => {
                const $url = $('#orderForm').attr('action').replace('update', 'edit').replace('split', 'edit');
                const orderRequest = loadOrder($url);
                orderRequest.then((html) => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    initOrderInfo();
                    $(document).trigger("order.updated")
                });
            })
    });

    $('.remove-quantity', orderForm).on('click', (event) => {
        const orderId = $('#order').children().attr('data-id');
        const viewElement = $($(event.currentTarget).attr("href"));
        const currentLine = viewElement.parents('tr');
        const formElementQuantity = currentLine?.find('input[name$="-quantity"]');
        const formElementSum = currentLine?.find('input[name$="-sum"]');
        const newVal = parseInt(viewElement.val()) - 1;
        if (newVal === 0) return;
        const newSum = (newVal * parseFloat(currentLine?.find('input[name$="-price"]').val())).toFixed(2);
        formElementQuantity.val(newVal).trigger('change');
        formElementSum.val(newSum).trigger('change');
        editOrder()
            .then((_) => {
                const $url = $('#orderForm').attr('action').replace('update', 'edit').replace('split', 'edit');
                const orderRequest = loadOrder($url);
                orderRequest.then((html) => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    initOrderInfo();
                    $(document).trigger("order.updated")
                });
            })
    });

    $('[name="remove-item"]', orderForm).on('click', event => {
        event.preventDefault();
        const link = $(event.currentTarget);
        const item = link.parents('tr')?.find('input[name$="DELETE"]');
        if (item)
            item.prop('checked', true);

        updateOrderView(
            link.attr('href'),
            link.attr('href'),
            link.parents('div[id^="order-item-"]')
        );
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
                    if (el['name'] == `items-${itemID}-price`)
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
                        alert('Ошибка открытия формы: ' + error);
                    }
                });        
            }
            $modal.removeClass('hidden');
            return;
        });
    });

}


export default orderEvents;

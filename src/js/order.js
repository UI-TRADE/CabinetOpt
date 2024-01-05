import generateUUID, {extractContent} from './lib';
import autocomplete from './components/autocomplete';
import updateProductCard from './catalog_card';
import getPrice from './price';
import {updateTotalSizeInfo, addSelectionSizesEvents, addSizeSlider} from './cart';


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


const updateOrderItem = (element) => {

    const productStocksAndCosts = (productIds, size='') => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/stocks_and_costs',
                data: {'productIds': productIds, 'size': size},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const getItemParams = (data, productId) => {
        const products         = JSON.parse(data['products']);
        const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
        const actual_prices    = JSON.parse(data['actual_prices']);
        const discount_prices  = JSON.parse(data['discount_prices']);
        const default_sizes    = JSON.parse(data['default_sizes']);

        let inStok = 0; let weight = 0; let size = ''; const sizes = [];
        let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
        const product = products.find(el => el['pk'] == productId);
        const product_stocks_and_costs = stocks_and_costs.filter(el => el['fields'].product == productId);
        const stock_and_cost = product_stocks_and_costs.find(_ => true);
        const actual_price = actual_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const discount_price = discount_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const defaultSize = default_sizes.filter(el => el['fields'].product == productId).find(_ => true);

        if (stock_and_cost) {
            maxPrice = stock_and_cost['fields'].cost;
            weight = stock_and_cost['fields'].weight;
            inStok = stock_and_cost['fields'].stock;    
        }

        if (defaultSize) {
            maxPrice = defaultSize['fields'].cost;
            weight = defaultSize['fields'].weight;
            size = defaultSize['fields'].size;
            inStok = defaultSize['fields'].stock;   
        }

        if (actual_price) { 
            currentPrice = actual_price['fields'].price;
            currentDiscount = actual_price['fields'].discount;
        }

        if (discount_price) {
            maxPrice = discount_price['fields'].price;
            currentDiscount = discount_price['fields'].discount;   
        }

        product_stocks_and_costs.forEach((item) => {
            const itemSize = item['fields'].size;
            if (itemSize) sizes.push({
                'value': itemSize[itemSize.length-1],
                'size': itemSize.find(_=>true),
                'stock_and_cost': item
            });
        });
        
        return {
            'weight': weight,
            'size': size,
            'inStok': inStok,
            'currentPrice': currentPrice,
            'currentDiscount': currentDiscount,
            'maxPrice': maxPrice,
            // 'unit': product['fields'].unit,
            'unit': '796',
            'sizes': sizes
        } 
    }

    const addSize = (element, value, text, selected=false, item=undefined) => {
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.selected = selected;
        newOption.textContent = text;
        if (item) newOption.setAttribute('data-json', JSON.stringify(item))
        element.appendChild(newOption);
    }

    const partsOfId = element.id.split('-');
    const prefId = partsOfId.slice(0, partsOfId.length-1).join('-');
    const productField           = document.getElementById(`${prefId}-product`);
    const nomenclature_sizeField = document.getElementById(`${prefId}-nomenclature_size`);
    const weightField            = document.getElementById(`${prefId}-weight`);
    const sizeField              = document.getElementById(`${prefId}-size`);
    const quantityField          = document.getElementById(`${prefId}-quantity`);
    const unitField              = document.getElementById(`${prefId}-unit`);
    const priceField             = document.getElementById(`${prefId}-price`);
    const sumField               = document.getElementById(`${prefId}-sum`);

    const selectedProdOption = productField.options[productField.selectedIndex];
    const productId = selectedProdOption.value;
    if (!productId) return;

    const selectedSizeOption = nomenclature_sizeField.options[nomenclature_sizeField.selectedIndex];
    const selectedSize = selectedSizeOption.textContent;

    if (partsOfId[partsOfId.length-1] === 'product') {
        productStocksAndCosts(productId)
            .then((data) => {
                nomenclature_sizeField.innerHTML = '';
                addSize(nomenclature_sizeField, '', '--');

                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                itemParams.sizes.forEach((item) => {
                    addSize(
                        nomenclature_sizeField, item.size, item.size,
                        (item.size === (itemParams.size) ? itemParams.size : ''), item.stock_and_cost
                    );    
                });
                Array.from(unitField.options).forEach((unitOption) => {
                    if (unitOption.value == itemParams.unit) unitOption.setAttribute('selected', true);
                });
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);
            })
            .catch((error) => {
                alert('Ошибка заполнения номенклатуры в строке заказа: ' + error);
            });
    }
    else if (['nomenclature_size', 'size'].indexOf(partsOfId[partsOfId.length - 1]) >= 0) {
        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);
                if (itemParams.size) {
                    const selectedSizeId = sizeField.options[sizeField.selectedIndex].value;
                    if (selectedSizeId !== itemParams.size[itemParams.size.length-1]) {
                        sizeField.innerHTML = `<option value="${itemParams.size[itemParams.size.length-1]}" selected="">${itemParams.size[0]}</option>`;
                    }    
                }  
            })
            .catch((error) => {
                alert('Ошибка заполнения размеров в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'quantity') {
        sumField.value = (parseFloat(priceField.value) * parseFloat(element.value)).toFixed(2);
        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);                
            })
            .catch((error) => {
                alert('Ошибка расчета веса в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'price') {
        sumField.value = quantityField.value * element.value;
    }
    else if (partsOfId[partsOfId.length-1] === 'sum') {
        priceField.value = element.value / (quantityField.value != 0 ? quantityField.value : 1);
    }
    else if (partsOfId[partsOfId.length-1] === 'price_type') {
    }

}


const selectOrderItems = (checked) => {
    const checkFields = document.getElementsByName('order-product-item-selection');
    for (var i=0; i < checkFields.length; i++) {
        checkFields[i].checked = checked;
    }
}


const addOrderItem = () => {

    const addNewOrderItem = (orderForm) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/orders/order/item/create',
                data: {order_id: orderForm.querySelector('input[name="items-__prefix__-order"]').value},
                success: (response) => {
                    orderForm.querySelector(
                        'input[name="items-__prefix__-id"]'
                    ).value = response['item_id'];
                    resolve(orderForm);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const extractElement = (html, elementSelector) => {
        const DOMModel = new DOMParser().parseFromString(html, 'text/html');
        return DOMModel.querySelector(elementSelector);
    }    

    const addColToTableRow = (row, element) => {
        const newCol = document.createElement('td');
        newCol.innerHTML = element;
        row.appendChild(newCol);
        return newCol;
    }

    if(window.document.location.pathname.indexOf("/orders/order/edit/") === -1){
        return;
    }

    const orderTableBody = document.getElementById('order-items').getElementsByTagName('tbody')[0];
    const __prefix__ = orderTableBody.getElementsByClassName('order-product-item').length;
    const orderItemForm = $('#empty-form').clone()[0];
    const newRow = document.createElement('tr');
    newRow.classList.add('order-product-item');

    addColToTableRow(
        newRow,
        `<td><input type="checkbox" id="${generateUUID()}" name="order-product-item-selection"></td>`
    );

    addNewOrderItem(orderItemForm)
        .then((data) => {
            data.querySelectorAll('*').forEach((node) => {
                if (node.name === 'items-__prefix__-order') {
                    orderTableBody.appendChild(extractElement(
                        node.outerHTML.replaceAll('__prefix__',  __prefix__),
                        'input[name="items-__prefix__-order"]'.replace('__prefix__',  __prefix__)
                    ));
                    return;
                }
                if (node.name === 'items-__prefix__-id') {
                    orderTableBody.appendChild(extractElement(
                        node.outerHTML.replaceAll('__prefix__',  __prefix__),
                        'input[name="items-__prefix__-id"]'.replace('__prefix__',  __prefix__)
                    ));
                    return;
                }                
                if(node.type !== 'hidden' && (node.nodeName === 'SELECT' | node.nodeName === 'INPUT')) {
                    if (node.name == "items-__prefix__-nomenclature_size") node.innerHTML = '<option value="0">--</option>';
                    const nodeId = node.id.replaceAll('__prefix__',  __prefix__);
                    const htmlElement = node.outerHTML.replaceAll('__prefix__',  __prefix__);
                    const newCol = addColToTableRow(newRow, `${htmlElement}<div class="formset-field"></div>`);
                    if (node.style.display == 'none') newCol.style.display = "none";
                    if (nodeId && newRow.querySelector(`#${nodeId}`)) newRow.querySelector(`#${nodeId}`).addEventListener(
                            'change',
                            (event) => {
                                updateOrderItem(event.currentTarget);
                        });
                    }
            });

            orderTableBody.appendChild(newRow);
            orderTableBody.querySelector('input[name="items-TOTAL_FORMS"]').value = __prefix__ + 1;
            orderTableBody.querySelector('input[name="items-INITIAL_FORMS"]').value = __prefix__ + 1;

            autocomplete(document.getElementById(`id_items-${__prefix__}-nomenclature`));
        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });

}


const deleteOrderItem = (orderTableBody, removedElement) => {
    const randomFormElement = removedElement.querySelector('input[class="form-control"]');
    const match = randomFormElement.name.match(/items-(\d+)-\w+/);
    if (match) {
        const formId = parseInt(match[1], 10);
        orderTableBody.removeChild(removedElement);
        orderTableBody.removeChild(orderTableBody.querySelector(`input[name="items-${formId}-id"]`));
        orderTableBody.removeChild(orderTableBody.querySelector(`input[name="items-${formId}-order"]`));
    }

}


const deleteOrderItems = () => {
    const orderTableBody = document.getElementById('order-items').getElementsByTagName('tbody')[0];
    const selectionFields = orderTableBody.querySelectorAll('input[name="order-product-item-selection"]');
    selectionFields.forEach((el) => {
        if(el.checked) {
            const deletedRow = el.parentElement.parentElement;
            const allFields = deletedRow.querySelectorAll('input');
            for (var i=0; i < allFields.length; i++) {
                if (allFields[i].name.indexOf('DELETE') !== -1) {
                    allFields[i].checked = true;
                }
            }
            deletedRow.style.display = 'none';
        }
    });
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
        success: (data) => {
            if (reload) 
                location.reload();
            else {
                $.ajax({
                    url: url_get,
                    method: "get",
                })
                .then(html => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    orderEvents();
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


export function updateOrder() {

    const orderStocksAndCosts = (orderId) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/orders/stocks_and_costs',
                data: {'orderId': orderId},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const addSize = (element, value, text, selected=false, item=undefined) => {
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.selected = selected;
        newOption.textContent = text;
        if (item) newOption.setAttribute('data-json', JSON.stringify(item))
        element.appendChild(newOption);
    }

    const removeUnselectedOptions = (parentElement, selector) => {
        const field = parentElement.querySelector(selector);
        const fieldOptions = field.childNodes;
        for (var i=0; i<fieldOptions.length; i++) {
            if (fieldOptions[i].selected) break;
        }
        const dataOfSelectedOption = {
            'value': fieldOptions[i].value, 'text': fieldOptions[i].textContent
        };
        field.innerHTML = fieldOptions[i].outerHTML;
        return dataOfSelectedOption;
    }

    if (document.location.pathname.indexOf("/orders/order/") === -1 && document.location.pathname.indexOf("/orders/orders/") === -1 ) {
        return;
    }

    let orderId = window.location.pathname.split('/').reverse().find(x=>x!=='');
    const orderItemElement = $("#order-item");
    if(orderId === 'orders' && orderItemElement.length){
        orderId = orderItemElement.data("id")
    }else{
        return;
    }

    orderStocksAndCosts(orderId)
        .then((data) => {
            if (data['replay'] == 'error') throw new Error(data['message']);

            const order            = JSON.parse(data['order']);
            const products         = JSON.parse(data['products']);
            const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
            const orderItems = document.getElementsByClassName('order-product-item');

            for (var i=0; i<orderItems.length; i++) {
                //очищаем элементы со списком выбора
                const nomenclatureElement         = orderItems[i].querySelector(`#id_items-${i}-nomenclature`);
                const nomenclatureSizeElement     = orderItems[i].querySelector(`#id_items-${i}-nomenclature_size`);
                nomenclatureElement.innerHTML     = '';
                nomenclatureSizeElement.innerHTML = '';

                //находим выбранную номенклатуру и заполяем ее на экране, остальное удаляем
                const selectedProduct = removeUnselectedOptions(orderItems[i], `#id_items-${i}-product`);
                if (selectedProduct) {
                    nomenclatureElement.value = selectedProduct.text;
                    nomenclatureElement.setAttribute('data-json', JSON.stringify(
                        products.find(el => el['pk'] == selectedProduct.value)
                    ));
                }

                //находим выбранный размер, и выводим все размеры на экран
                // const itemSizeValue = orderItems[i].querySelector(`#id_items-${i}-size`).value;
                const selectedSize    = removeUnselectedOptions(orderItems[i], `#id_items-${i}-size`);
                //добавляем пустой размер по умолчанию
                addSize(nomenclatureSizeElement,  '', '--', (!selectedSize.value));
                //добавляем доступные размеры
                const foundStocksAndCosts = stocks_and_costs.filter(
                    el => el['fields'].product == selectedProduct.value && el['fields'].size
                );
                foundStocksAndCosts.forEach((item) => {
                    const size = item['fields'].size.find(_ => true);
                    addSize(
                        nomenclatureSizeElement,
                        size,
                        size,
                        (selectedSize.text == size),
                        item
                    );
                })
            }

            const orderStatus = order.find(_=>true)['fields']['status'];
            if(orderStatus !== 'introductory') {
                $('input').attr('disabled', true);
                $('select').attr('disabled', true);
                $('#closeOrder').attr('disabled', false);
            }

        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });

}


function editOrder(){
    const $form = $('#orderForm');
    return $.ajax({
        url: $form.attr('action').replace('update', 'edit'),
        method: "post",
        data: $form.serialize(),
        succes: (response) => {
            $(document).trigger("order.updated", response);
            return response;
        },
        error: (error) => {
            console.warn(error);
        }
    });
}


export function orderEvents() {
    const orderForm = $("#orderForm")
    $('.order__toolbar__btn').on('click', (event) => {
        let elementName = event.target.getAttribute('name');
        if (!elementName) {
            elementName = event.target.parentElement.getAttribute('name');
        }

        if (elementName === 'add-item') {
            addOrderItem();
        } else if (elementName === 'delete-item') {
            deleteOrderItems();
        } else if (elementName === 'select-items') {
            selectOrderItems(true);
        } else if (elementName === 'unselect-items') {
            selectOrderItems(false);
        }

    });

    const nomenclatureElements = document.querySelectorAll('.order__field__nomenclature');
    for (var i = 0; i < nomenclatureElements.length; i++) {
        autocomplete(nomenclatureElements[i]);
    }

    const nomenclatureSizeElements = document.querySelectorAll('.order__field__nomenclature_size');
    for (var i = 0; i < nomenclatureSizeElements.length; i++) {
        nomenclatureSizeElements[i].addEventListener('change', (event) => {
            const orderItems = document.querySelectorAll('.order-product-item');
            for (var j=0; j<orderItems.length; j++) {
                if (orderItems[j].contains(event.target)) {
                    const sizeField = orderItems[j].querySelector(`select[name="items-${j}-size"]`);
                    updateOrderItem(sizeField);
                    break;
                }
            }
        });
    }

    $('.order__field__nomenclature_size').on('change', (event) => {
        updateOrderItem(event.currentTarget);
    });

    $('.order__field').on('change', (event) => {
        updateOrderItem(event.currentTarget);
    });

    $(`#sendTalant`).on('click', (event) => {
        const orderId = $(event.target).attr('data-id');
        const link = $(`#order-status-${orderId}`).find('a');
        updateOrderView('', link.attr('href'), $(event.target), 'confirmed', true);
    });

    $(`#closeOrder`).on('click', (event) => {
        const redirect_url = event.target.getAttribute("data-url");
        document.location.href = redirect_url;
    });

    $('.add-quantity', orderForm).on("click", function(){
        const orderId = $('#order').children().attr('data-id');
        const element = $($(this).attr("href"))
        const newVal = parseInt(element.val()) + 1;
        element.val(parseInt(element.val()) + 1).trigger('change')
        $(`[name=items-${element.data("index")}-quantity]`).val(newVal).trigger('change')
        editOrder()
            .then((html) => {
                const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                // $(DOMModel.querySelector("#order-item")).appendTo($("#order, #order-item").empty())
                $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                orderEvents();
                $(document).trigger("order.updated")
            })
    });

    $('.remove-quantity', orderForm).on('click', () => {
        const orderId = $('#order').children().attr('data-id');
        const element = $($(this).attr("href"))
        const currentValue = element.val()
        if(currentValue != 1){
            const newVal = parseInt(element.val()) - 1
            element.val(newVal).trigger('change')

            $(`[name=items-${element.data("index")}-quantity]`).val(newVal).trigger('change')
            editOrder()
                .then((html) => {
                    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                    $(DOMModel.querySelector(`#order-item-${orderId}`)).appendTo($("#order").empty());
                    orderEvents()
                    $(document).trigger("order.updated")
                })
        }
    });

    $('[name="delete-item"]', orderForm).on('click', event => {
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

    // $(`#checkDuplicates`).on('click', (event) => {
    //     $('[id]').each(function(){
    //         var id = $('[id="'+this.id+'"]');
    //         if(id.length>1 && id[0]==this) {
    //           console.log('Duplicate id '+this.id);
    //           console.log(this);
    //           alert('duplicate found');
    //         }
    //     });
    // })
}


export default orderEvents;

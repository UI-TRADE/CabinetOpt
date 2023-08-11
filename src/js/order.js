import getPrice from './price'


const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}


const updateOrderItem = (element) => {

    const productStocksAndCosts = (productIds, size=0) => {
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
        const actual_prices    = JSON.parse(data['actual_prices']);
        const discount_prices  = JSON.parse(data['discount_prices']);
        const default_sizes    = JSON.parse(data['default_sizes']);

        let inStok = 0; let weight = 0; let size = 0;
        let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
        const product = products.find(el => el['pk'] == productId);
        const actual_price = actual_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const discount_price = discount_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const defaultSize = default_sizes.filter(el => el['fields'].product == productId).find(_ => true);

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
        
        return {
            'weight': weight,
            'size': size,
            'inStok': inStok,
            'currentPrice': currentPrice,
            'currentDiscount': currentDiscount,
            'maxPrice': maxPrice,
            'unit': product['fields'].unit
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
    const idOfProductField          = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-product`;
    const idOfQuantityField         = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-quantity`;
    const idOfWeightField           = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-weight`;
    const idOfSizeField             = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-size`;
    const idOfPriceField            = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-price`;
    const idOfSumField              = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-sum`;
    const idOfNomenclatureSizeField = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-nomenclature_size`;


    const productField           = document.getElementById(idOfProductField);    
    const nomenclature_sizeField = document.getElementById(idOfNomenclatureSizeField);
    const weightField            = document.getElementById(idOfWeightField);
    const sizeField              = document.getElementById(idOfSizeField);
    const quantityField          = document.getElementById(idOfQuantityField);
    const priceField             = document.getElementById(idOfPriceField);
    const sumField               = document.getElementById(idOfSumField);

    if (partsOfId[partsOfId.length-1] === 'product') {

        const productFieldNodes = productField.childNodes;
        for (var j=0; j<productFieldNodes.length; j++) {
            if (productFieldNodes[j].selected) break;
        }
        const productId = productFieldNodes[j].value;
        if (!productId) return;

        productStocksAndCosts(productId)
            .then((data) => {
                nomenclature_sizeField.innerHTML = '';
                addSize(nomenclature_sizeField, 0, '--');

                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                if (itemParams.size) {
                    sizeField.value   = itemParams.size;
                    const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == productId);
                    stock_and_cost.filter(el => el['fields'].size).forEach((item) => {
                        addSize(
                            nomenclature_sizeField, item['fields'].size, item['fields'].size,
                            (item['fields'].size == itemParams.size), item
                        );
                    });
                }
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);
            })
            .catch((error) => {
                alert('Ошибка заполнения номенклатуры в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'size') {
        const productFieldNodes = productField.childNodes;
        for (var j=0; j<productFieldNodes.length; j++) {
            if (productFieldNodes[j].selected) break;
        }
        const productId = productFieldNodes[j].value;
        if (!productId) return;

        const nomenclature_sizeFieldNodes = nomenclature_sizeField.childNodes;
        for (var i=0; i<nomenclature_sizeFieldNodes.length; i++) {
            if (nomenclature_sizeFieldNodes[i].selected) break;
        }
        const selectedSize = nomenclature_sizeFieldNodes[i].value;

        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                if (itemParams.size)   sizeField.value   = itemParams.size;
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);                
            })
            .catch((error) => {
                alert('Ошибка заполнения размеров в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'nomenclature_size') {
        const productFieldNodes = productField.childNodes;
        for (var j=0; j<productFieldNodes.length; j++) {
            if (productFieldNodes[j].selected) break;
        }
        const productId = productFieldNodes[j].value;
        if (!productId) return;

        const nomenclature_sizeFieldNodes = nomenclature_sizeField.childNodes;
        for (var i=0; i<nomenclature_sizeFieldNodes.length; i++) {
            if (nomenclature_sizeFieldNodes[i].selected) break;
        }
        const selectedSize = nomenclature_sizeFieldNodes[i].value;

        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                if (itemParams.size)   sizeField.value   = itemParams.size;
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);                
            })
            .catch((error) => {
                alert('Ошибка заполнения размеров в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'quantity') {
        sumField.value = (parseFloat(priceField.value) * parseFloat(element.value)).toFixed(2);

        const productFieldNodes = productField.childNodes;
        for (var j=0; j<productFieldNodes.length; j++) {
            if (productFieldNodes[j].selected) break;
        }
        const productId = productFieldNodes[j].value;
        if (!productId) return;

        const nomenclature_sizeFieldNodes = nomenclature_sizeField.childNodes;
        for (var i=0; i<nomenclature_sizeFieldNodes.length; i++) {
            if (nomenclature_sizeFieldNodes[i].selected) break;
        }
        const selectedSize = nomenclature_sizeFieldNodes[i].value;

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
    }

    if(window.document.location.pathname.indexOf("/orders/order/edit/") === -1){
        return;
    }

    const orderTableBody = document.getElementById('order_items').getElementsByTagName('tbody')[0];
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
                    addColToTableRow(newRow, `${htmlElement}<div class="formset-field"></div>`);
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
    const orderTableBody = document.getElementById('order_items').getElementsByTagName('tbody')[0];
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


const autocomplete = (element) => {

    var currentFocus = 0;

    const pickUpProducts = (searchString) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/pickup_products',
                data: {searchString: searchString},
                success: (response) => {
                    resolve(response['data']);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }    

    const addActive = (currentItems) => {
        if (!currentItems) return false;
        removeActive(currentItems);
        if (currentFocus >= currentItems.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (currentItems.length - 1);
        currentItems[currentFocus].classList.add('autocomplete-active');
    }

    const removeActive = (currentItems) => {
        for (var i = 0; i < currentItems.length; i++) {
            currentItems[i].classList.remove('autocomplete-active');
        }
    }    

    const closeAllLists = () => {
        const autocompleteItems = document.getElementsByClassName('autocomplete-items');
        for(var i=0; i<autocompleteItems.length; i++){
            autocompleteItems[i].parentElement.removeChild(autocompleteItems[i]);
        }
    }

    element.addEventListener('input', (event) => {
        const currentTarget = event.target;

        if (!currentTarget.value) {
            closeAllLists();
            return
        }

        let autocompleteElement = document.getElementById(currentTarget.id + '__autocomplete-list');
        if (!autocompleteElement) {
            autocompleteElement = document.createElement("div");
            autocompleteElement.setAttribute("id", currentTarget.id + "__autocomplete-list");
            autocompleteElement.classList.add("autocomplete-items");
        }
        else {
            autocompleteElement.innerHTML = '';
        }

        pickUpProducts(currentTarget.value)
            .then((data) => {
                const foundData = JSON.parse(data);
                foundData.forEach((el) => {
                    const listItem = document.createElement("div");

                    listItem.innerHTML =  `<p>${el['fields']['name']}</p>`;
                    listItem.innerHTML += `<input type='hidden' value='${JSON.stringify(el)}'>`;
                    listItem.addEventListener('click', (select) => {
                        if (select.target.querySelector('input')) {
                            currentTarget.value = JSON.parse(
                                select.target.getElementsByTagName('input')[0].value
                            )['fields']['name'];
                        } else {
                            currentTarget.value = JSON.parse(
                                select.target.parentElement.getElementsByTagName('input')[0].value
                            )['fields']['name'];    
                        }
                        currentTarget.setAttribute('data-json', JSON.stringify(el));
                        const productField = document.querySelector(`#${currentTarget.id.replace('nomenclature', 'product')}`);
                        productField.innerHTML = `<option value="${el['pk']}" selected>${el['fields']['name']}</option>`;
                        updateOrderItem(productField);
                        closeAllLists();
                    });
                    autocompleteElement.appendChild(listItem);
                });
                
                event.target.parentElement.appendChild(autocompleteElement);        
            })
            .catch((error) => {
                alert('Ошибка заполнения строки заказа: ' + error);
            });
    });

    element.addEventListener('keydown', (event) => {
        const currentTarget = event.target;
        if (!currentTarget.value) {
            closeAllLists();
            return
        }

        let autocompleteElement = document.getElementById(currentTarget.id + '__autocomplete-list');
        let autocompleteItems = [];

        if (autocompleteElement) autocompleteItems = autocompleteElement.getElementsByTagName("div");
        if (event.keyCode == 40) {
            currentFocus++;
            addActive(autocompleteItems);
        } else if (event.keyCode == 38) {
            currentFocus--;
            addActive(autocompleteItems);
        } else if (event.keyCode == 13) {
            event.preventDefault();
            if (currentFocus > -1) {
                if (autocompleteItems) autocompleteItems[currentFocus].click();
            }
        }
    });
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

    if (document.location.pathname.indexOf("/orders/order/") === -1) {
        return;
    }

    const orderId = window.location.pathname.split('/').reverse().find(x=>x!=='');

    orderStocksAndCosts(orderId)
        .then((data) => {
            if (data['replay'] == 'error') throw new Error(data['message']);

            const products         = JSON.parse(data['products']);
            const stocks_and_costs = JSON.parse(data['stocks_and_costs']);

            const orderItems = document.getElementsByClassName('order-product-item');
            for (var i=0; i<orderItems.length; i++) {
                const currentSize = orderItems[i].querySelector(`#id_items-${i}-size`).value;

                const nomenclature_Field = orderItems[i].querySelector(`#id_items-${i}-nomenclature`);
                const nomenclature_sizeField = orderItems[i].querySelector(`#id_items-${i}-nomenclature_size`);
                nomenclature_Field.innerHTML = '' ; nomenclature_sizeField.innerHTML = '';

                addSize(nomenclature_sizeField, 0, '--', (!currentSize));

                const productField = orderItems[i].querySelector(`#id_items-${i}-product`);
                const productFieldNodes = productField.childNodes;
                for (var j=0; j<productFieldNodes.length; j++) {
                    if (productFieldNodes[j].selected) break;
                }
                const productId = productFieldNodes[j].value;
                const productName = productFieldNodes[j].textContent;
                productField.innerHTML = productFieldNodes[j].outerHTML;

                if (!productId) continue;
                nomenclature_Field.value = productName;
                nomenclature_Field.setAttribute('data-json', JSON.stringify(
                    products.find(el => el['pk'] == productId)
                ));

                const foundStocksAndCosts = stocks_and_costs.filter(
                    el => el['fields'].product == productId && el['fields'].size
                );
                foundStocksAndCosts.forEach((item) => {
                    addSize(
                        nomenclature_sizeField,
                        item['fields'].size,
                        item['fields'].size,
                        (currentSize == item['fields'].size),
                        item
                    );
                })

            }

        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });

}


function orderEvents() {

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

    const orderFieldNomenclature = document.getElementsByClassName('order__field__nomenclature');
    for (var i = 0; i < orderFieldNomenclature.length; i++) {
        autocomplete(orderFieldNomenclature[i]);
    }

    const orderFieldNomenclatureSize = document.getElementsByClassName('order__field__nomenclature_size');
    for (var i = 0; i < orderFieldNomenclatureSize.length; i++) {
        orderFieldNomenclatureSize[i].addEventListener('change', (event) => {

            const orderItems = document.getElementsByClassName('order-product-item');
            for (var i=0; i<orderItems.length; i++) {
                if (orderItems[i].contains(event.target)) {
                    const sizeField = orderItems[i].querySelector(`input[name="items-${i}-size"]`);
                    sizeField.value = event.target.value;
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
}


export default orderEvents;

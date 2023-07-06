var menuItem = '';

const get_unit_repr = (unit) => {
    if (unit == '163') {
        return 'грамм'
    }
    return 'штук'
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

const loadJson = (selector) => {
    return JSON.parse(document.querySelector(selector).getAttribute('data-json'));
}


const setInputValueByName = (elementName, value) => {
    document.getElementsByName(elementName).forEach((node) => {
        if (node.tagName === 'INPUT' && value) {
            node.value = value;
            return;
        }
    })
}


const removeErrors = () => {
    Array.from(
        document.getElementsByClassName('errors')
    ).forEach((item) => {
        while (item.firstChild) {
            item.removeChild(item.firstChild);
        }
    });
}


const showErrors = (errors) => {
    removeErrors();
    $.each(JSON.parse(errors), (name, error) => {
        error.forEach((item) => {
            const newError = document.createElement('p');
            newError.textContent = item['message'];
            Array.from(
                document.getElementsByClassName(`${name}-error`)
            ).forEach((element) => {
                element.appendChild(newError);
            });
        });
    });
}


const showModalForm = (formId) => {
    $(`#${formId}`).on('shown.bs.modal', (event) => {
        $.ajax({
            url: event.relatedTarget.getAttribute('data-url'),
            success: (data) => {
                $(`#${formId}`).html(data);
            },
            error: (xhr, status, error) => {
                alert('Ошибка: ' + error);
            }
        });
    });
    updateModalForm(formId);   
}


const updateModalForm = (formId) => {
    $(`#${formId}`).on('submit', (event) => {
        event.preventDefault();
        $.ajax({
            type: 'POST',
            url: event.target.action,
            data: $(`.${formId}`).serialize(),
            success: (data) => {
                if(data['errors']) {
                    showErrors(data['errors']);
                    data['errors'] = {}
                } else {
                    $('.modal').modal('hide');
                    location.reload();
                }
            },
            error: (response) => {
                const errors = JSON.parse(response.responseText).errors;
                showErrors(errors);
            }
        });
    });
}


const updateForm = (formId) => {
    $.ajax({
        url: $(`#${formId}`).attr('action'),
        success: (data) => {
            $(`#${formId}`).html(data);
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}


const extractContent = (html, elementId) => {
    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
    return DOMModel.getElementById(elementId)?.innerHTML;
}


const extractElement = (html, elementSelector) => {
    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
    return DOMModel.querySelector(elementSelector);
}


const updateProducts = (elementId, data) => {
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (data) => {
            $(`#${elementId}`).html(
                extractContent(data, elementId)
            );
            document.getElementById(elementId).style.display = 'block';
            setProductsPrice();
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}


const toggleClassButton = (target, fromClass, toClass) => {
    const classes = target.classList;
    if ( classes.contains(fromClass) ) {
        classes.add(toClass);
        classes.remove(fromClass);
    } else if ( classes.contains(toClass) ) {
        classes.add(fromClass);
        classes.remove(toClass);
    }
}


const showElement = (elementId, show) => {
    document.getElementById(elementId).style.display = show ? 'block' : 'none';
}


const switchCartView = (checked) => {
    document.getElementById('products').style.display = checked ? 'none' : 'block';
    document.getElementById('cart-table').style.display = checked ? 'block' : 'none';
    localStorage.setItem('cartView', checked);
}


const updateCartView = (elementId) => {
    const switchElement = document.getElementById(elementId);
    if (switchElement === null) {
        return;
    }
    if (localStorage.getItem('cartView') === 'true') {
        switchElement.click();
    }
    switchCartView(switchElement.checked)
    document.getElementById('cartViewArea').style.display = 'block';
}


const fillCollectionTree = (collection, collectionList, excludedCollection) => {

    const excludedCollections = excludedCollection.split(',');
    Object.keys(collection).forEach((key) => {
        const node = collection[key];
        for (const nodeName in node) {
            if (node.hasOwnProperty(nodeName)) {
                innerHTML = 
                    `<li class="list-group-item"><span class="collection-box">${nodeName}</span>
                        <ul class="collection-nested list-group list-group-flush">`;

                node[nodeName].forEach((item) => {
                    const checked = (excludedCollections.find(el => el === `collection-${item['id']}`)) ? "" : "checked"
                    innerHTML += 
                        `<li class="list-group-item" style="padding-top: 5px; padding-bottom: 5px; margin-left: 25px;">
                            <input class="form-check-input me-1 switch-change" type="checkbox" value="collection" id="collection-${item['id']}" ${checked}>
                            <label class="form-check-label" for="collection-${item['id']}" style="font-size: smaller;">${item['name']}</label></li>`;

                });
                innerHTML += `</ul></li>`;
                collectionList.innerHTML += innerHTML;
            }
          }
    });

}


const createBrandAndCollectionLists = () => {
    if (document.location.pathname !== "/catalog/products/") {
        return;
    }
    const excludedВrands = localStorage.getItem('excludedВrands');
    const excludedCollection = localStorage.getItem('excludedCollection');

    const brandList = document.querySelector('.brend-group'); 
    loadJson('#brands').forEach((brand) => {
        const checked = (excludedВrands.includes(`brand-${brand.pk}`)) ? "" : "checked"
        brandList.innerHTML += 
        `<li class="list-group-item">
            <input class="form-check-input me-1 switch-change" type="checkbox" value="brand" id="brand-${brand.pk}" ${checked}>
            <label class="form-check-label" for="brand-${brand.pk}">${brand.fields.name}</label>
        </li>`
    });

    const collectionGroup = document.querySelector('.collection-group'); 
    fillCollectionTree(loadJson('#collections'), collectionGroup, excludedCollection);

    updateProducts('products', {
        'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        'data': JSON.stringify({
            'brand': excludedВrands.split(','),
            'collection': excludedCollection.split(',')
        })
    }); 
}


const addToCart = (formId) => {
    const productForm = document.getElementById(formId);
    const formData = new FormData(productForm);

    $.ajax({
        url: `/cart/send/${formId.replace('cartForm-', '')}/`,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            location.reload();
        },
        error: function(xhr, status, error) {
            alert('Ошибка: ' + error);
        }
    });
}


const updateOrderItem = (element) => {

    const productSizeAndPrices = (productId, size=0) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/product_size_and_prices',
                data: {'productId': productId, 'size': size},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const partsOfId = element.id.split('-');
    const idOfProductField          = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-product`;
    const idOfQuantityField         = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-quantity`;
    const idOfWeightField           = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-weight`;
    const idOfSizeField             = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-size`;
    const idOfPriceField            = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-price`;
    const idOfSumField              = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-sum`;
    const idOfNomenclatureSizeField = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-nomenclature_size`;   
    if (partsOfId[partsOfId.length-1] === 'product') {

        const productFieldNodes = document.getElementById(idOfProductField).childNodes;
        for (var i=0; i<productFieldNodes.length; i++) {
            if (productFieldNodes[i].selected) break;
        }
        productId = productFieldNodes[i].value;
        productSizeAndPrices(productId)
            .then((data) => {
                const quantity = document.getElementById(idOfQuantityField);
                const prises = JSON.parse(data['price']);
                const sizes  = JSON.parse(data['sizes']);

                console.log('sizes: ', sizes);

                let currentPrice = 0; let discount = 0;
                if (prises.length > 0) {
                    currentPrice = prises[0]['fields']['price']; 
                    discount = prises[0]['fields']['discount'];
                }

                if (sizes.length > 0) {
                    const defaultSize = getDefaultSize(productId, data['collection'], sizes, data['gender']);
                    if (defaultSize) {
                        document.getElementById(idOfWeightField).value = defaultSize['weight'];
                        document.getElementById(idOfSizeField).value = defaultSize['size'];
                        currentPrice = calculatePrice(currentPrice, defaultSize['cost'], discount);
                        const sizeField = document.getElementById(idOfNomenclatureSizeField);
                        sizeField.innerHTML = `<option value="0">--</option>`;
                        sizes.forEach((size) => {
                            sizeField.innerHTML += `<option value="${size.fields.size}" \
                                ${defaultSize['size'] == size.fields.size ? "selected": ""}>${size.fields.size}</option>`;
                        });
                }} 
                document.getElementById(idOfPriceField).value = currentPrice;
                document.getElementById(idOfSumField).value = quantity.value * currentPrice;
            })
            .catch((error) => {
                alert('Ошибка: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'size') {
        const productFieldNodes = document.getElementById(idOfProductField).childNodes;
        for (var i=0; i<productFieldNodes.length; i++) {
            if (productFieldNodes[i].selected) break;
        }
        productId = productFieldNodes[i].value;
        productSizeAndPrices(productId, element.value)
            .then((data) => {
                const quantity = document.getElementById(idOfQuantityField);
                const prises = JSON.parse(data['price']);
                const sizes  = JSON.parse(data['sizes']);

                let currentPrice = 0; let discount = 0;
                if (prises.length > 0) {
                    currentPrice = prises[0]['fields']['price']; 
                    discount = prises[0]['fields']['discount'];
                }

                if (sizes.length > 0) {
                    const defaultSize = getDefaultSize(productId, data['collection'], sizes, data['gender']);
                    if (defaultSize) {
                        document.getElementById(idOfWeightField).value = defaultSize['weight'];
                        currentPrice = calculatePrice(currentPrice, defaultSize['cost'], discount);
                }}
                
                document.getElementById(idOfPriceField).value = currentPrice;
                document.getElementById(idOfSumField).value = quantity.value * currentPrice;
            })
            .catch((error) => {
                alert('Ошибка: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'quantity') {
        const price = document.getElementById(idOfPriceField);
        const sum = document.getElementById(idOfSumField);
        sum.value = price.value * element.value;
    }
    else if (partsOfId[partsOfId.length-1] === 'price') {
        const quantity = document.getElementById(idOfQuantityField);
        const sum = document.getElementById(idOfSumField);
        sum.value = quantity.value * element.value;
    }
    else if (partsOfId[partsOfId.length-1] === 'sum') {
        const quantity = document.getElementById(idOfQuantityField);
        const price = document.getElementById(idOfPriceField);
        price.value = element.value / (quantity.value != 0 ? quantity.value : 1);
    }
    else if (partsOfId[partsOfId.length-1] === 'price_type') {
    }
}


const calculatePrice = (currentPrice, maxPrice, discount) => {
    if (maxPrice > 0) {
        currentPrice = maxPrice;
    }
    if (discount > 0) {
        currentPrice = currentPrice - (currentPrice * discount / 100)   
    }
    return currentPrice;  
}


const updateProductCardWeight = (size) => {
    var weight = 0;
    loadJson('#sizes').forEach((element) => {
        if (element.fields.size == size) {
            weight = element.fields.weight;
            document.getElementById('product_weigth').textContent = `${weight} грамм`;
        }
    });
    setInputValueByName('weight', weight);
}


const updateProductCardPrice = (size) => {
    const priceItem = loadJson('#price').find(Boolean)?.fields;
    let currentPrice = priceItem.price;
    loadJson('#sizes').forEach((element) => {
        if (element.fields.size == size) {
            currentPrice = calculatePrice(
                currentPrice, element.fields.cost, priceItem.discount
            );
        }
    });
    document.getElementById('product_price').textContent = `${currentPrice} руб.`;
    setInputValueByName('price', currentPrice);
    setInputValueByName('unit', priceItem.unit);

}


const updateProductSize = (size) => {
    setInputValueByName('size', size);
}


const getDefaultSize = (productId, collection, sizes, gender) => {
    let defaultSize = 0; let size;

    if (['кольцо', 'кольца', 'колечки', 'колец'].find(el => el == collection.toLowerCase().trim())) {
        defaultSize = 20;
        if (gender == 'женский' | gender == 'Ж') {
            defaultSize = 17;    
        }
    }
    if (['цепь', 'цепи', 'цепочка', 'цепочек'].find(el => el == collection)) {
        defaultSize = 50;
    }

    for(var i=0; i < sizes.length; i++) {
        if (sizes[i].fields.product != productId) {
            continue;
        }
        size = sizes[i].fields;
        if (defaultSize > 0 && defaultSize == sizes[i].fields.size) {
            break;
        }   
    }

    return size;
}


const setProductsPrice = () => {
    const sizes = loadJson('#sizes');
    const elements = document.getElementsByClassName('good-block-info');
    for (var i=0; i < elements.length; i++) {
        const productInfo = JSON.parse(elements[i].getAttribute('data-json'));
        const productId = elements[i].id.replace(/[^\d.]/g, '');
        const defaultSize = getDefaultSize(
            productId, productInfo.collection, sizes, productInfo.gender
        );

        if (!productInfo?.fields) {
            continue;
        }

        let currentPrice = productInfo.fields.price;
        const inStok = productInfo?.instok;
        if (defaultSize) {
            currentPrice = calculatePrice(
                currentPrice, defaultSize.cost, productInfo.fields.discount
            );
        }

        const priceBlock = elements[i].parentElement.querySelector('.price-block');
        if (currentPrice > 0) {
            priceBlock.querySelector('.price').textContent = `Цена: ${currentPrice} руб.`;

        }
        if (inStok > 0) {
            priceBlock.querySelector('.in_stock').textContent = 
                `В наличии: ${inStok} ${get_unit_repr(productInfo.fields.unit)}`;    
        }

        var inputFields = priceBlock.getElementsByTagName('input');
        for (let item of inputFields) {
            if (item.name === 'price' && currentPrice) {
                item.value = currentPrice;    
            }
            if (item.name === 'unit') {
                item.value = productInfo.fields.unit;   
            }
            if (item.name === 'size' && defaultSize?.size) {
                item.value = defaultSize.size;
            }
            if (item.name === 'weight' && defaultSize?.weight) {
                item.value = defaultSize.weight;
            }
        }

    }
}


const setSizeByDefault = () => {
    if (document.location.pathname.indexOf("/catalog/product/") === -1) {
        return;
    }
    const productInfo = loadJson('.good-block-info');
    const defaultSize = getDefaultSize(
        productInfo.product, productInfo.collection,
        loadJson('#sizes'), productInfo.gender
    );
    if (defaultSize) {
        const toggler = document.getElementsByClassName('product__size__block');
        for (var i=0; i < toggler.length; i++) {
            if (toggler[i].textContent != defaultSize.size) {
                continue;
            }
            toggler[i].classList.add('product__size__block--select');
            break;
        }
        updateProductCardWeight(defaultSize.size);
        updateProductCardPrice(defaultSize.size);
        updateProductSize(defaultSize.size);
    }
}


const clearSelectionList = (className) => {
    const orderFields = document.getElementsByClassName(className);
    for(var i=0; i<orderFields.length; i++) {
        fieldOptions = orderFields[i].querySelectorAll('*');
        for(var j=0; j<fieldOptions.length; j++) {
            if (!fieldOptions[j].selected) {
                fieldOptions[j].parentNode.removeChild(fieldOptions[j]);
            }
        }    
    }
}


const updateOrderProductField = (nameOfFromField, nameOfToField) => {

    const updateField = (nameOfFromField, nameOfToField) => {
        const options = nameOfFromField.querySelectorAll('option');
        for (var i=0; i<options.length; i++) {
            if (options[i].selected) {
                nameOfToField.value = options[i].textContent
                break;
            }
        }
    }

    const orderItems = document.getElementsByClassName('order-product-item');
    for (var i=0; i<orderItems.length; i++) {
        updateField(
            orderItems[i].querySelector(`#id_items-${i}-${nameOfFromField}`),
            orderItems[i].querySelector(`#id_items-${i}-${nameOfToField}`)
        );
    }

}


const updateOrderSizeField = (nameOfFromField, nameOfToField) => {

    if (document.location.pathname.indexOf("/orders/order/") === -1) {
        return;
    }

    const sizes = loadJson('#sizes');
    const orderItems = document.getElementsByClassName('order-product-item');
    for (var i=0; i<orderItems.length; i++) {
        const productId = orderItems[i].querySelector(`#id_items-${i}-product`)?.value;
        const currentSize = orderItems[i].querySelector(`#id_items-${i}-${nameOfFromField}`)?.value;
        const sizeField = orderItems[i].querySelector(`#id_items-${i}-${nameOfToField}`);
        sizeField.innerHTML = `<option value="0">--</option>`;
        if (sizes[productId.toString()]) {
            sizes[productId.toString()].forEach((size) => {
                sizeField.innerHTML += `<option value="${size}" ${currentSize == size ? "selected": ""}>${size}</option>`;
            });
        }
    }
}


const selectMenuItem = (element) => {
    sessionStorage.setItem('selectedURI', element.dataset.url);
    window.location.href = element.dataset.url;
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
                    const htmlElement = node.outerHTML.replaceAll('__prefix__',  __prefix__);
                    addColToTableRow(newRow, `${htmlElement}<div class="formset-field"></div>`);
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

    const addSelectedOption = (elementId, data) => {
        const orderItemField = document.getElementById(elementId);
        orderItemField.innerHTML = `<option value="${data['pk']}" selected>${data['fields']['name']}</option>`;
        updateOrderItem(orderItemField);
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
                foundData = JSON.parse(data);
                foundData.forEach((el) => {
                    listItem = document.createElement("div");

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
                        addSelectedOption(currentTarget.id.replace('nomenclature', 'product'), el);
                        closeAllLists();
                    });
                    autocompleteElement.appendChild(listItem);
                });
                
                event.target.parentElement.appendChild(autocompleteElement);        
            })
            .catch((error) => {
                alert('Ошибка: ' + error);
            });
    });

    element.addEventListener('keydown', (event) => {
        const currentTarget = event.target;
        if (!currentTarget.value) {
            closeAllLists();
            return
        }

        let autocompleteElement = document.getElementById(currentTarget.id + '__autocomplete-list');

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


const addEvents = () => {

    // $('.order-row').click((event) => {
    //     window.document.location = event.currentTarget.dataset.href
    // });

    $('#cartView').click((event) => {
        switchCartView(event.currentTarget.checked);
    });

    $('#Brend').on('click', (event) => {
        toggleClassButton(event.currentTarget, 'btn-success', 'btn-outline-success');
        toggleClassButton(
            document.getElementById('Assortment'), 'btn-outline-warning', 'btn-warning'
        );
        if ( event.currentTarget.classList.contains('btn-success') ) {
            showElement('brend-group', true);
            showElement('collection-group', false);
        } else {
            showElement('brend-group', false);
            showElement('collection-group', true);
        }
    });
    
    $('#Assortment').on('click', (event) => {
        toggleClassButton(event.currentTarget, 'btn-warning', 'btn-outline-warning');
        toggleClassButton(
            document.getElementById('Brend'), 'btn-outline-success', 'btn-success'
        );
        if ( event.currentTarget.classList.contains('btn-warning') ) {
            showElement('collection-group', true);
            showElement('brend-group', false);
        } else {
            showElement('collection-group', false);
            showElement('brend-group', true);
        }
    });
    
    $('.switch-change').on('change', (event) => {
        data = {'brand': [], 'collection': []};
        Array.from(
            document.getElementsByClassName('switch-change')
        ).forEach((item) => {
            if ( item.checked ) {
                return;
            }
            data[item.value].push(item.id);
        });
        localStorage.setItem('excludedВrands', data.brand);
        localStorage.setItem('excludedCollection', data.collection);
        
        updateProducts('products', {
            'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
            'data': JSON.stringify(data)
        });
    });

    $('.product__size__block').on('click', (event) => {
        const toggler = document.getElementsByClassName('product__size__block');
        for (var i=0; i < toggler.length; i++) {
            if (toggler[i].classList.contains('product__size__block--select')) {
                toggler[i].classList.remove('product__size__block--select');    
            }
        }
        event.target.classList.add('product__size__block--select');
        updateProductCardWeight(event.target.innerText);
        updateProductCardPrice(event.target.innerText);
        updateProductSize(event.target.innerText);
    });

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

    const collectionBoxToggler = document.getElementsByClassName('collection-box');
    for (var i = 0; i < collectionBoxToggler.length; i++) {
        collectionBoxToggler[i].addEventListener('click', (event) => {
        if (event.target.parentElement) {
            event.target.parentElement.querySelector('.collection-nested')?.classList.toggle('collection-active');
            event.target.classList.toggle('collection-open-box');
        }
      });
    }

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
}


$(window).on("load", () => {
    if (localStorage.getItem('cartView') === null) {
        localStorage.setItem('cartView', false);
    }
    if (localStorage.getItem('excludedВrands') === null) {
        localStorage.setItem('excludedВrands', new Array());
    }
    if (localStorage.getItem('excludedCollection') === null) {
        localStorage.setItem('excludedCollection', new Array());
    }

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
    clearSelectionList('order__field__product');
});


$(document).ready(() => {
    showModalForm('loginForm'); 
    showModalForm('regRequestForm');
    updateForm('contactForm');
    updateCartView('cartView');
    createBrandAndCollectionLists();
    setSizeByDefault();
    updateOrderProductField('product', 'nomenclature');
    updateOrderSizeField('size', 'nomenclature_size')
    addEvents();
})


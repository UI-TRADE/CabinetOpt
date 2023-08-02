var menuItem = '';

const get_unit_repr = (unit) => {
    if (unit == '163') {
        return 'грамм'
    }
    return 'штук'
}

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}

const loadJson = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return []
    return JSON.parse(document.querySelector(selector).getAttribute('data-json'));
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
    (formId == 'fileSelectionForm') ? updateFileSelectionForm() : updateModalForm(formId); 
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


const updateFileSelectionForm = () => {
    const formId = 'fileSelectionForm';
    $(`#${formId}`).on('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        $.ajax({
            type: 'POST',
            url: event.target.action,
            data: formData,
            processData: false,
            contentType: false,
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


const updateContactView = (formId) => {
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


const updateElement = (selector) => {
    $.ajax({
        url: location.href,
        success: (response) => {
            const reloadHtml = new DOMParser().parseFromString(response, 'text/html');
            document.querySelector(selector).outerHTML = reloadHtml.querySelector(selector).outerHTML;
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}


const updateProducts = (elementId, data) => {
    const mainElement = document.getElementById(elementId);
    if (!document.getElementById(elementId)) return;
    mainElement.style = "display: none;";
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (data) => {
            $(`#${elementId}`).html(
                extractContent(data, elementId)
            );
            updateProductCards(mainElement);
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


const initProductFilters = () => {

    const fillCollectionTree = (collections, collectionElement, excludedCollection) => {

        const groups = []; 
        const excludedCollections = excludedCollection.split(','); 
        
        if (!collectionElement) return;

        collections.forEach((item) => {
            if (!groups.find(el => el == item.group_name)) groups.push(item.group_name)
        });
       
        collectionElement.innerHTML = '';

        groups.forEach((group) => {

            innerHTML = 
            `<li class="list-group-item">
                <span class="collection-box">${group}</span>
                <ul class="collection-nested list-group list-group-flush">`;
    
            const foundCollections = collections.filter(el => el.group_name == group);
            foundCollections.forEach((collection) => {
                const checked = (excludedCollections.find(el => el === `collection-${collection['id']}`)) ? "" : "checked";
                innerHTML += 
                    `<li class="list-group-item" style="padding-top: 5px; padding-bottom: 5px; margin-left: 25px;">
                        <input class="form-check-input me-1 filter-control" type="checkbox" value="collection" id="collection-${collection['id']}" ${checked}>
                        <label class="form-check-label" for="collection-${collection['id']}" style="font-size: smaller;">${collection['name']}</label>
                    </li>`;
            });

            innerHTML += '</ul></li>'
            collectionElement.innerHTML += innerHTML;
        });
    }    

    if (document.location.pathname !== "/catalog/products/") {
        return;
    }

    data = {'brand': [], 'collection': []};
    const excludedВrands = localStorage.getItem('excludedВrands');
    const excludedCollection = localStorage.getItem('excludedCollection');
    const filters = JSON.parse(sessionStorage.getItem('filters'));

    const brandList = document.querySelector('.brend-group'); 
    loadJson('#brands').forEach((brand) => {
        const checked = (excludedВrands.includes(`brand-${brand.pk}`)) ? "" : "checked"
        brandList.innerHTML += 
        `<li class="list-group-item">
            <input class="form-check-input me-1 filter-control" type="checkbox" value="brand" id="brand-${brand.pk}" ${checked}>
            <label class="form-check-label" for="brand-${brand.pk}">${brand.fields.name}</label>
        </li>`
    });
    data['brand'] = excludedВrands.split(',');

    fillCollectionTree(loadJson('#collections'), document.querySelector('.collection-group'), excludedCollection);
    data['collection'] = excludedCollection.split(',');

    Object.keys(filters).forEach(key => {
        const filter_field = document.querySelector(`.filter-control[name="${key}"]`);
        if (filter_field.tagName == 'INPUT') filter_field.value = filters[key];
        if (filter_field.tagName == 'SELECT') {
            const selectionItems = filter_field.children;
            for (var i=0; i<selectionItems.length; i++) {
                selectionItems[i].selected = false;
                if (selectionItems[i].value == filters[key]) selectionItems[i].selected = true;
            }
        }
        data[key] = filters[key];
    });

    updateProducts('products', {
        'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        'data': JSON.stringify(data)
    });
}


const updateCartElements = (element, cartData, params) => {
    const cartButton     = element.querySelector('input[name="add-to-cart"]');
    const cartElements   = element.querySelector('div[name="cart-row"]');
    if (!cartElements) return;
    const cartElement    = cartElements.querySelector('input');
    const cartKeyElement = cartElements.querySelector('[name="cart-key"]');
    cartButton.parentElement.style = "display: block";
    cartElements.style             = "display: none";
    if (cartData) {
        cartButton.parentElement.style = "display: none";
        cartElements.style             = "display: flex";
        cartElement.value              = cartData['quantity'];
        cartKeyElement.textContent     = JSON.stringify(params);
    }
}


const waitUpdateCart = (element, params) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/info/${params['productId']}/${params['size']}`,
            success: (cartData) => {
                updateCartElements(element, cartData, params);
                resolve(true);
            },
            error: (error) => {
                reject(false);
            }
        });
    });
};


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
            try {
                if (response['replay'] == 'error') throw new Error(response['message']);
                $.ajax({
                    url: `/cart/info/${response['pk']}/${response['size']}`,
                    success: (cartData) => {
                        updateCartElements(
                            productForm.parentElement.parentElement,
                            cartData,
                            {'productId': response['pk'], 'size': response['size']}
                        );
                    },
                    error: (error) => {
                        alert('Ошибка обновления корзины: ' + error);
                    }
                });
                
            } catch(error) {
                alert('Ошибка добавления в корзину: ' + error);    
            }
            updateElement('li[name="cart_detail"]');
        },
        error: function(xhr, status, error) {
            alert('Ошибка добавления в корзину: ' + error);
        }
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
        const collections      = JSON.parse(data['collection']);
        const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
        const actual_prices    = JSON.parse(data['actual_prices']);
        const discount_prices  = JSON.parse(data['discount_prices']);

        let inStok = 0; let weight = 0; let size = 0;
        let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
        const product = products.find(el => el['pk'] == productId);
        const collection = collections.find(el => el['id'] == productId);
        const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == productId);
        const actual_price = actual_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(el => true);
        const discount_price = discount_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(el => true);

        const defaultSize = getDefaultSize(
            productId, collection['collection_group'],
            stock_and_cost, product['fields'].gender
        )

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
                alert('Ошибка: ' + error);
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
                alert('Ошибка: ' + error);
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
                alert('Ошибка: ' + error);
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
                alert('Ошибка: ' + error);
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


/**
 * Действия при изменении индикатора количество изделий в корзине.
 * 
 * element         - поле ввода количества в корзине.
 * preventReload   - удаляет текущую позицию в корзине если количество 0.
 */
const OnQuantityChange = (element, preventReload=false) => {

    /**
     * Получает информацию о позиции корзины с бэка.
     * 
     * params         - структура с productId и size для идентификации товара в корзине.
     */
    const getCartInfo = (params) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `/cart/info/${params['productId']}/${params['size']}`,
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    /**
     * Рекурсивно получает ключ позиции в корзине.
     * 
     * element - поле ввода количества в корзине.
     * i       - порядковый номер интерации, не более 5
     */
    const getCartKey = (element, i) => {
        if (i >= 5) return ""; i++;
        const foundElement = element.querySelector('[name="cart-key"]');
        if (foundElement) {
            return JSON.parse(foundElement.textContent);
        }
        return getCartKey(element.parentElement, i);
    }

    /**
     * Обновляет позицию товара в корзине.
     * 
     * element         - поле ввода количества в корзине.
     * preventReload   - удаляет текущую позицию в корзине если количество 0.
     */
    const updateCartItem = (element, preventReload=false) => {

        const cartRows = document.querySelectorAll('[name="cart-row"]');
        cartRows.forEach((cartRow) => {
            if (cartRow.contains(element)) {
                const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]');
                const cartKey = cartRow.querySelector('[name="cart-key"]');
                const params = JSON.parse(cartKey.textContent);

                getCartInfo(params)
                    .then((data) => {
                        const quantity = data['quantity'];
                        const formData = new FormData();
                        formData.append('csrfmiddlewaretoken', csrfToken.value);
                        formData.append('quantity', element.value - quantity);
                        formData.append('update'  , true);
                        formData.append('size'    , params['size']);

                        $.ajax({
                            url: `/cart/add/${params['productId']}/`,
                            type: 'POST',
                            data: formData,
                            processData: false,
                            contentType: false,
                            success: (response) => {
                                if (!preventReload) {
                                    const reloadHtml = new DOMParser().parseFromString(response, 'text/html');
                                    const allCartKeys = reloadHtml.querySelectorAll('[name="cart-key"]');
                                    for(var i=0; i<allCartKeys.length; i++) {
                                        if (allCartKeys[i].textContent == cartKey.textContent) break;
                                    }
                                    cartRow.outerHTML = allCartKeys[i].parentElement.outerHTML;
                                }
                                updateElement('li[name="cart_detail"]');
                            },
                            error: (xhr, status, error) => {
                                alert('Ошибка: ' + error);
                            }
                        });   
                    })
                    .catch((error) => {});
            }
        });

    }

    const quantity = parseInt(element.value);
    if (quantity == 0) {
        const cartKey = getCartKey(element, 0);
        $.ajax({
            url: `/cart/remove/${cartKey.productId}/${cartKey.size}/`,
            success: (response) => {
                if (!preventReload) {
                    const cartRows = document.querySelectorAll('[name="cart-row"]');
                    cartRows.forEach((cartRow) => {
                        if (cartRow.contains(element)) {
                            cartRow.outerHTML = '';
                        }
                    });
                }
                $.ajax({
                    url: `/cart/info/${cartKey.productId}/${cartKey.size}`,
                    success: (cartData) => {
                        updateCartElements(
                            element.parentElement.parentElement,
                            cartData,
                            cartKey
                        );
                    },
                    error: (error) => {
                        alert('Ошибка обновления корзины: ' + error);
                    }
                });
                updateElement('li[name="cart_detail"]');
            },
            error: (xhr, status, error) => {
                alert('Ошибка удаления товара из корзины: ' + error);
            }
        });
    } else {
        updateCartItem(element, preventReload);    
    }   
}


const addOneToCart = (element) => {
    const cartElement = element.parentElement.querySelector('input');
    cartElement.value = parseInt(cartElement.value) + 1;
    OnQuantityChange(cartElement, true);
}


const delOneFromCart = (element) => {
    const cartElement = element.parentElement.querySelector('input');
    cartElement.value = parseInt(cartElement.value) - 1;
    OnQuantityChange(cartElement, true);
}


const calculatePrice = (clientPrice, weight=0) => {
    let result = parseFloat(clientPrice);
    if (weight) result = (parseFloat(clientPrice) * weight).toFixed(2);

    return result;
}


const calculateMaxPrice = (maxPrice, weight=0) => {
    let result = 0;
    if (parseFloat(maxPrice) > 0) {
        if (weight) result = (parseFloat(maxPrice) * weight).toFixed(2);
    }

    return result;
}


const getPrice = (clientPrice, maxPrice, clientDiscount, weight=0) => {
    const result = {'clientPrice': 0, 'clientDiscount': 0, 'clientDiscountPrice': 0, 'maxPrice': 0};

    const price = calculatePrice(clientPrice, weight);
    if (!price) return result;

    result['clientPrice'] = price;
    result['clientDiscount'] = clientDiscount;    

    if (clientDiscount) {
        result['clientDiscountPrice'] = (price - (price * clientDiscount / 100)).toFixed(2);
    }

    result['maxPrice'] = calculateMaxPrice(maxPrice, weight);

    return result;
}


const getDefaultSize = (productId, collection, sizes, gender) => {
    let defaultSize = 0; if (!sizes) return;

    try {
        defaultSize = sizes.sort((firstItem, nextItem) => {
            if (firstItem['fields'].size < nextItem['fields'].size) return -1;
            if (firstItem['fields'].size > nextItem['fields'].size) return 1;
            return 0;
        }).find(item => true)['fields'].size;
    } catch {}

    if (collection) {
        if (['кольцо', 'кольца', 'колечки', 'колец'].find(el => el == collection.toLowerCase().trim())) {
            if (sizes.find(
                el => el['fields'].product == productId && el['fields'].size == 20
            )) defaultSize = 20;
            if (gender == 'женский' | gender == 'Ж') {
                if (sizes.find(
                    el => el['fields'].product == productId && el['fields'].size == 17
                )) defaultSize = 17;    
            }
        }
        if (['цепь', 'цепи', 'цепочка', 'цепочек'].find(el => el == collection)) {
            if (sizes.find(
                el => el['fields'].product == productId && el['fields'].size == 50
            )) defaultSize = 50;
        }
    }

    const foundSizes = sizes.filter(el => el['fields'].product == productId && el['fields'].size == defaultSize);

    return foundSizes.sort((firstItem, nextItem) => {
        if (firstItem['fields'].weight < nextItem['fields'].weight) return 1;
        if (firstItem['fields'].weight > nextItem['fields'].weight) return -1;
        return 0;
    }).find(item => true);

}


/**
 * Добавляет обработчк события выбора размера.
 * 
 * element   - выбранный элемент DOM.
 */
const addSelectSizeEvent = (element) => {
    const boundInfo = JSON.parse(element.parentElement.getAttribute('data-json'));
    if (!boundInfo) return;
    const boundFields = boundInfo['fields'];
    if (!boundFields) return;
    updatePriceInProductCard({
            'size': boundFields.size, 'weight': boundFields.weight,
            'inStok': boundFields.stock, 'price': boundInfo['clientPrice'],
            'discount': boundInfo['clientDiscount'], 'maxPrice': boundInfo['clientMaxPrice']
    });
    removeClass(document, 'product__block__size-btn'  , 'product__block__size-btn--selected');
    removeClass(document, 'product__block__size-label', 'product__block__size-label--selected');
    element.classList.toggle('product__block__size-btn--selected');
    element.parentElement.querySelector('label').
        classList.toggle('product__block__size-label--selected');
}


/**
 * Управляет отображением элементов прокрутки размеров.
 */
const showSizeControls = () => {
    const sizeBlock      = document.querySelector('#size-block');
    const sizeElements   = JSON.parse(sizeBlock.getAttribute('data-json'));
    const sizeItemsShown = sizeBlock.querySelectorAll('.product__block__size-group--position');

    const minElement = sizeElements[0];
    const maxElement = sizeElements[sizeElements.length-1];
    const firstElement = sizeItemsShown[0];
    const endElement = sizeItemsShown[sizeItemsShown.length-1];

    const minId   = minElement['id'];
    const maxId   = maxElement['id'];
    const firstId = firstElement.getAttribute('data-id');
    const lastId  = endElement.getAttribute('data-id');

    const sizeBackElement = '<div id="size-back" onclick="backSize(this)"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const sizeNextElement = '<div id="size-next" onclick="nextSize(this)"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

    if (firstId > minId) sizeBlock.innerHTML = sizeBackElement + sizeBlock.innerHTML;
    if (lastId < maxId)  sizeBlock.innerHTML = sizeBlock.innerHTML + sizeNextElement;
}


/**
 * Отображает таблицу размеров и весов в карточке товаров.
 * 
 * firstIdx   - начальный индекс отображаемых размеров.
 * lastIdx    - начальный индекс отображаемых размеров.
 */
const showSizes = (firstIdx=0, lastIdx=0) => {
    const widthSizeElement = 58;
    const sizeBlock = document.querySelector('#size-block');
    let maxLength = sizeBlock.offsetWidth;
    const sizeElements = JSON.parse(sizeBlock.getAttribute('data-json'));
    const maxIdx = Math.max(lastIdx, sizeElements.length);
    sizeBlock.innerHTML = '';
    for (var i=firstIdx; i < maxIdx; i++) {
        maxLength = maxLength - widthSizeElement;
        if (maxLength > widthSizeElement) {
            sizeBlock.innerHTML += sizeElements[i]['element'];   
        }
    }
    showSizeControls();
    Array.from(sizeBlock.childNodes).forEach(element => {
        element.addEventListener('click', (event) => {
            addSelectSizeEvent(event.target);
        });
    })
}

/**
 * Удаляет css класс элемента.
 *
 * element   - родительский элемент DOM.
 * className - имя css класса по которому метод находит элемент для удаления css класса.
 * toggleClassName - имя удаляемого css класса.
 */
const removeClass = (element, className, toggleClassName) => {
    const toggler = element.getElementsByClassName(className);
    for (var k=0; k<toggler.length; k++) {
        if (toggler[k].classList.contains(toggleClassName)) {
            toggler[k].classList.remove(toggleClassName);    
        }
    }
}


/**
 * Добавляет обработчк события перемещения по линейке размера.
 * 
 * element   - выбранный элемент DOM.
 */
const nextSize = (element) => {
    const sizeBlock      = document.querySelector('#size-block');
    const sizeItemsShown = sizeBlock.querySelectorAll('.product__block__size-group--position');

    const shownIds = [];
    sizeItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(++idx);    
    });
    showSizes(shownIds[0], shownIds[shownIds.length-1]);
}


/**
 * Добавляет обработчк события перемещения по линейке размера.
 * 
 * element   - выбранный элемент DOM.
 */
const backSize = (element) => {
    const sizeBlock      = document.querySelector('#size-block');
    const sizeItemsShown = sizeBlock.querySelectorAll('.product__block__size-group--position');

    const shownIds = [];
    sizeItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(--idx);    
    });
    showSizes(shownIds[0], shownIds[shownIds.length-1]);
}


/**
 * Управляет отображением элементов прокрутки комплектов.
 */
const showSetsControls = () => {
    const setBlock      = document.querySelector('#set-block');
    const setElements   = JSON.parse(setBlock.getAttribute('data-json'));
    const setItemsShown = setBlock.querySelectorAll('.product__set-block__imgs');

    const minElement   = setElements[0];
    const maxElement   = setElements[setElements.length-1];
    const firstElement = setItemsShown[0];
    const endElement   = setItemsShown[setItemsShown.length-1];

    const minId   = (minElement)   ? minElement['id']                    : 0;
    const maxId   = (maxElement)   ? maxElement['id']                    : 0;
    const firstId = (firstElement) ? firstElement.getAttribute('data-id'): 0;
    const lastId  = (endElement)   ? endElement.getAttribute('data-id')  : 0;

    const backElement = '<div id="set-back" onclick="backSets(this)"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const nextElement = '<div id="set-next" onclick="nextSets(this)"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

    if (firstId > minId) setBlock.innerHTML = backElement + setBlock.innerHTML;
    if (lastId < maxId)  setBlock.innerHTML = setBlock.innerHTML + nextElement;
}


/**
 * Отображает картинки коллекций товаров.
 * 
 * firstIdx   - начальный индекс отображаемых картинок.
 * lastIdx    - начальный индекс отображаемых картинок.
 */
const showSets = (firstIdx=0, lastIdx=0) => {
    const widthSetElement = 50;
    const setBlock = document.querySelector('#set-block');
    let maxLength = setBlock.offsetWidth;
    const setElements = JSON.parse(setBlock.getAttribute('data-json'));
    const maxIdx = Math.max(lastIdx, setElements.length);
    setBlock.innerHTML = '';
    for (var i=firstIdx; i < maxIdx; i++) {
        maxLength = maxLength - widthSetElement;
        if (maxLength > widthSetElement) {
            setBlock.innerHTML += setElements[i]['element'];   
        }
    }
    showSetsControls();
}

/**
 * Добавляет обработчк события перемещения по линейке изображений.
 * 
 * element   - выбранный элемент DOM.
 */
const nextSets = (element) => {
    const setBlock      = document.querySelector('#set-block');
    const setItemsShown = setBlock.querySelectorAll('.product__set-block__imgs');

    const shownIds = [];
    setItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(++idx);    
    });
    showSets(shownIds[0], shownIds[shownIds.length-1]);
}


/**
 * Добавляет обработчк события перемещения по линейке изображений.
 * 
 * element   - выбранный элемент DOM.
 */
const backSets = (element) => {
    const setBlock      = document.querySelector('#set-block');
    const setItemsShown = setBlock.querySelectorAll('.product__set-block__imgs');

    const shownIds = [];
    setItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(--idx);    
    });
    showSets(shownIds[0], shownIds[shownIds.length-1]);
}


/**
 * Управляет отображением элементов прокрутки аналогов.
 */
const showAnaloguesControls = () => {
    const analoguesBlock      = document.querySelector('#analogues-block');
    const analoguesElements   = JSON.parse(analoguesBlock.getAttribute('data-json'));
    const analoguesItemsShown = analoguesBlock.querySelectorAll('.product__analogues-block__imgs');

    const minElement   = analoguesElements[0];
    const maxElement   = analoguesElements[analoguesElements.length-1];
    const firstElement = analoguesItemsShown[0];
    const endElement   = analoguesItemsShown[analoguesItemsShown.length-1];

    const minId   = (minElement)   ? minElement['id']                    : 0;
    const maxId   = (maxElement)   ? maxElement['id']                    : 0;
    const firstId = (firstElement) ? firstElement.getAttribute('data-id'): 0;
    const lastId  = (endElement)   ? endElement.getAttribute('data-id')  : 0;

    const backElement = '<div id="set-back" onclick="backAnalogues(this)"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const nextElement = '<div id="set-next" onclick="nextAnalogues(this)"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

    if (firstId > minId) analoguesBlock.innerHTML = backElement + analoguesBlock.innerHTML;
    if (lastId < maxId)  analoguesBlock.innerHTML = analoguesBlock.innerHTML + nextElement;
}


/**
 * Отображает картинки аналогов товаров.
 * 
 * firstIdx   - начальный индекс отображаемых картинок.
 * lastIdx    - начальный индекс отображаемых картинок.
 */
const showAnalogues = (firstIdx=0, lastIdx=0) => {
    const widthAnaloguesElement = 50;
    const analoguesBlock = document.querySelector('#analogues-block');
    let maxLength = analoguesBlock.offsetWidth;
    const analoguesElements = JSON.parse(analoguesBlock.getAttribute('data-json'));
    const maxIdx = Math.max(lastIdx, analoguesElements.length);
    analoguesBlock.innerHTML = '';
    for (var i=firstIdx; i < maxIdx; i++) {
        maxLength = maxLength - widthAnaloguesElement;
        if (maxLength > widthAnaloguesElement) {
            analoguesBlock.innerHTML += analoguesElements[i]['element'];   
        }
    }
    showAnaloguesControls();
}


/**
 * Добавляет обработчк события перемещения по линейке изображений.
 * 
 * element   - выбранный элемент DOM.
 */
const nextAnalogues = (element) => {
    const analoguesBlock      = document.querySelector('#analogues-block');
    const analoguesItemsShown = analoguesBlock.querySelectorAll('.product__analogues-block__imgs');

    const shownIds = [];
    analoguesItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(++idx);    
    });
    showAnalogues(shownIds[0], shownIds[shownIds.length-1]);
}


/**
 * Добавляет обработчк события перемещения по линейке изображений.
 * 
 * element   - выбранный элемент DOM.
 */
const backAnalogues = (element) => {
    const analoguesBlock      = document.querySelector('#analogues-block');
    const analoguesItemsShown = analoguesBlock.querySelectorAll('.product__analogues-block__imgs');

    const shownIds = [];
    analoguesItemsShown.forEach((item) => {
        let idx = parseInt(item.getAttribute('data-id'));
        shownIds.push(--idx);    
    });
    showAnalogues(shownIds[0], shownIds[shownIds.length-1]);
}


const updateProductCards = (element) => {

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

    const updateElements = (data) => {
        return new Promise((resolve, reject) => {

            try {
                if (data['replay'] == 'error') throw new Error(data['message']);

                const elemsForUpdate   = []
                const products         = JSON.parse(data['products']);
                const collections      = JSON.parse(data['collection']);
                const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                const actual_prices    = JSON.parse(data['actual_prices']);
                const discount_prices  = JSON.parse(data['discount_prices']);

                for (var i=0; i < elements.length; i++) {
                    let inStok = 0; let weight = 0; let size = 0;
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
                    const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                    const product = products.find(el => el['pk'] == currentId['id']);
                    const collection = collections.find(el => el['id'] == currentId['id']);
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == currentId['id']);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(el => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(el => true);

                    const defaultSize = getDefaultSize(
                        currentId['id'],
                        collection['collection_group'],
                        stock_and_cost,
                        product['fields'].gender
                    )

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

                    const price = getPrice(currentPrice, maxPrice, currentDiscount, weight);

                    const priceBlock          = elements[i].querySelector('.price-block');
                    const inStockBlock        = elements[i].querySelector('.inStock-block');
                    const priceField          = priceBlock.querySelector('.price');
                    const weightField         = priceBlock.querySelector('.weight');
                    const pricePerweightField = priceBlock.querySelector('.price-per-weight');
                    const maxPriceField       = priceBlock.querySelector('.max-price');
                    const discountField       = priceBlock.querySelector('.discount');
                    const stockField          = inStockBlock.querySelector('.in_stock');
                    if (currentPrice) pricePerweightField.textContent = `${currentPrice} руб/гр`;
                    if (price.clientPrice) priceField.textContent = `${price.clientPrice} руб`;
                    if (currentDiscount>0) {
                        if (price.maxPrice) maxPriceField.textContent = `${price.maxPrice} руб`;
                        discountField.textContent = `- ${currentDiscount} %`
                    };
                    if (product['fields'].unit == '163' && weight) weightField.textContent = `Вес: ${weight} гр`;
                    if (inStok) stockField.textContent = `${inStok} шт`;

                    var inputFields = inStockBlock.getElementsByTagName('input');
                    for (let item of inputFields) {
                        if (item.name === 'price' && price.clientPrice) item.value = price.clientPrice;    
                        if (item.name === 'size' && size) item.value = size;
                        if (item.name === 'weight' && weight) item.value = defaultSize['fields'].weight;
                    }

                    elemsForUpdate.push(
                        {
                            'key': {'productId': currentId['id'], 'size': size},
                            'element': inStockBlock
                    });
                }
                resolve(elemsForUpdate);

            } catch (error) {

                reject(error);
    
            }
        });
    }

    const updateCarts = (cartElements) => {
        return new Promise((resolve, reject) => {
            try {
                const result = Promise.all(
                    cartElements.map((item) => waitUpdateCart(item.element, item.key))
                );
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    const updateProductsStatusStyle = () => {
        const statusFields = document.querySelectorAll('p[name="product-status"]');
        statusFields.forEach((statusField) => {
            const data = JSON.parse(statusField.getAttribute('data-json'));
            if (!data) return;
            if (data.status === "novelty") statusField.className = 'text-primary fs-3';
            if (data.status === "order")   statusField.className = 'text-info-emphasis fs-3';
            if (data.status === "hit")     statusField.className = 'text-warning fs-3';
            if (data.status === "sale")    statusField.className = 'text-danger fs-3';
        });
    }
    
    updateProductsStatusStyle();

    const productIds = []
    const elements = document.getElementsByClassName('good-block');
    for (var j=0; j<elements.length; j++) {
        const productId = JSON.parse(elements[j].getAttribute('data-json'));
        if (productId) productIds.push(productId['id']);
    }

    if (productIds.length == 0) {
        return
    }

    productStocksAndCosts(productIds.toString())
        .then((data) => {
            return updateElements(data);
        })
        .then((data) => {
            return updateCarts(data);
        })
        .then((result) => {
            if (result.every(Boolean)) element.style.display = 'block';
        })
        .catch((error) => {
            alert('Ошибка обновления каталога: ' + error);
        });
}

/**
 * Обновляет элементы цен в карточке номенклатуры.
 * 
 * context   - контекст с данными полученными с бэка и расчитанными на фронте.
 */
const updatePriceInProductCard = (context) => {

    const element             = document.querySelector('.good-block');
    const weightElement       = element.querySelector('#weigth-block');
    const discountElement     = element.querySelector('#discount-block');
    const priceElement        = element.querySelector('#price-block');
    const maxPriceElement     = element.querySelector('#max-price');
    const pricePerweightField = element.querySelector('#price-per-weight');
    const inStokelement       = element.querySelector('#in_stock');
    const formElement         = element.querySelector('form');
    
    const price = getPrice(context.price, context.maxPrice, context.discount, context.weight);
    
    if (context.weight && weightElement) weightElement.outerHTML = 
        `<p id="weigth-block"> ${context.weight} </p>`;
    if (parseFloat(price.clientDiscount) && discountElement) {
        discountElement.outerHTML = `<p id="discount-block"> ${price.clientDiscount} % </p>`;
        const discountElements = element.querySelectorAll('.discount');
        discountElements.forEach(item => {item.style.display = 'block'});
    } else {
        const discountElements = element.querySelectorAll('.discount');
        discountElements.forEach(item => {item.style.display = 'none'});
    }
    if (price.clientPrice && priceElement) priceElement.outerHTML = 
        `<p id="price-block"> ${price.clientPrice} руб </p>`;
    if (parseFloat(price.maxPrice) && maxPriceElement) {
        maxPriceElement.outerHTML = `<p id="max-price"> ${price.maxPrice} руб </p> `;
    } else {
        maxPriceElement.parentElement.style.display = 'none';
    }
    if (context.price && pricePerweightField) pricePerweightField.outerHTML = 
        `<p id="price-per-weight"> Цена за 1 г ${context.price} руб </p>`;
    if (context.inStok && inStokelement) inStokelement.outerHTML = 
        `<p id="in_stock"> В наличии ${context.inStok} шт </p>`;

    if (!formElement) return;
    var inputFields = formElement.querySelectorAll('input');
    for (let item of inputFields) {
        if (item.name === 'price' && price.clientPrice) item.value = price.clientPrice;
        if (item.name === 'size' && context.size)       item.value = context.size;
        if (item.name === 'weight' && context.weight)   item.value = context.weight;
    }
}


const setProductPrice = () => {

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

    const updateElements = (data) => {
        return new Promise((resolve, reject) => {
            try {
                if (data['replay'] == 'error') throw new Error(data['message']);

                const cartElementsForUpdate = [];
                const products         = JSON.parse(data['products']);
                const collections      = JSON.parse(data['collection']);
                const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                const actual_prices    = JSON.parse(data['actual_prices']);
                const discount_prices  = JSON.parse(data['discount_prices']);
    
                for (var i=0; i < elements.length; i++) {
                    let inStok = 0; let weight = 0; let size = 0;
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
                    const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                    const product = products.find(el => el['pk'] == currentId['id']);
                    const collection = collections.find(el => el['id'] == currentId['id']);
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == currentId['id']);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(el => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(el => true);
    
                    const defaultSize = getDefaultSize(
                        currentId['id'],
                        collection['collection_group'],
                        stock_and_cost,
                        product['fields'].gender
                    )
    
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
    
                    updatePriceInProductCard(
                        {
                            'size': size, 'weight': weight, 'inStok': inStok,
                            'price': currentPrice, 'discount': currentDiscount, 'maxPrice': maxPrice
                    });
    
                    if (!size) return;
                    const sizeElements = elements[i].querySelector('#size-block');
                    if (stock_and_cost && sizeElements) {
                        sizeElements.style.display = 'flex';
                        addSizeElements(sizeElements, stock_and_cost, currentPrice, currentDiscount, maxPrice, size);
                    }
                    showSizes();
    
                    cartElementsForUpdate.push(
                        {
                            'key': {'productId': currentId['id'], 'size': size},
                            'element': document.querySelector('.product__col__prices')
                    });
    
                }
                resolve(cartElementsForUpdate);

            } catch (error) {

                reject(error);
    
            }
        });        
    }

    const updateCarts = (cartElements) => {
        return new Promise((resolve, reject) => {
            try {
                const result = Promise.all(
                    cartElements.map((item) => waitUpdateCart(item.element, item.key))
                );
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    const productSets = (productId) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/product/accessories',
                data: {'productId': productId},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const productAnalogues = (productId) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/product/analogues',
                data: {'productId': productId},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }
    
    const updateProductsStatusStyle = () => {
        const statusFields = document.querySelectorAll('p[name="product-status"]');
        statusFields.forEach((statusField) => {
            const data = JSON.parse(statusField.getAttribute('data-json'));
            if (!data) return;
            if (data.status === "novelty") statusField.className = 'text-primary fs-3';
            if (data.status === "order")   statusField.className = 'text-info-emphasis fs-3';
            if (data.status === "hit")     statusField.className = 'text-warning fs-3';
        });
    }

    /**
     * Подготавливает элементы размера изделий и сохраняет их в json формате.
     *
     * element - элемент size-block в котором будут сохранены подготовленные элементы размеров.
     * stock_and_cost - данные о размеров полученные с бэка.
     * price - базовая цена.
     * discount - скидка от базовой цены.
     */
    const addSizeElements = (element, stock_and_cost, price, discount, maxPrice, default_size='') => {
        const sizes = [];
        stock_and_cost.forEach((item, idx) => {
            if (!item['fields'].size) return;
            item['clientPrice']    = price;
            item['clientDiscount'] = discount;
            item['clientMaxPrice'] = maxPrice;
            const itemFields = item['fields'];
            const sizeElement = addSizeElement(idx, itemFields.size, itemFields.weight);
            sizeElement.setAttribute('data-json', JSON.stringify(item));
            if (itemFields.size == default_size) {
                const btnElement = sizeElement.querySelector('input');
                if (btnElement) btnElement.classList.add('product__block__size-btn--selected');
                const labelElement = sizeElement.querySelector('label');
                if (labelElement) labelElement.classList.add('product__block__size-label--selected');
            }
            sizes.push({ 'id': idx, 'element': sizeElement.outerHTML });
        });
        element.setAttribute('data-json', JSON.stringify(sizes));
    }

    /**
     * Формирует элемент размера изделий на основании размера и веса.
     *
     * idx - индекс элемента.
     * size - значение размера изделия.
     * weight - значение веса изделия.
     */
    const addSizeElement = (idx, size, weight='0') => {
        const element = document.createElement("div");
        element.classList.add('product__block__size-group--position');
        element.innerHTML = 
            `<input
                id="size-${size}"
                type="button"
                value="${size}"
                class="btn product__block__size-btn--design product__block__size-btn product__block__size-btn--position"
            />
            <label for="size-${size}" class="product__block__size-label product__block__size-label--position">${(weight) ? weight : "-"}</label>
            `;
        element.setAttribute('data-id', idx);
        return element;
    }

    /**
     * Подготавливает элементы коллекций и сохраняет их в json формате.
     *
     * element - элемент set-block в котором будут сохранены подготовленные элементы размеров.
     * sets - массив данных о коллекциях полученные с бэка.
     */    
    const addSetElements = (element, sets) => {
        const prepared_sets = [];
        sets.forEach((item, idx) => {
            const sizeElement = addSetElement(idx, item['fields']);
            prepared_sets.push({ 'id': idx, 'element': sizeElement.outerHTML });
        });
        element.setAttribute('data-json', JSON.stringify(prepared_sets));
    }

    /**
     * Подготавливает комплектующие и сохраняет их в json формате.
     *
     * idx - индекс элемента.
     * item - данные изображений полученные с бэка.
     */
    const addSetElement = (idx, item) => {
        const element = document.createElement("a");
        element.href = `/catalog/product/${item.product}/`;
        element.classList.add('product__set-block__imgs');
        element.target="_blank";
        element.innerHTML = 
            `<img
                src="/media/${item.image}"
                class="
                    img-fluid
                    img-thumbnail
                    thumbnail-50
                    product__thumbnail__block--design
                    product__thumbnail__block--position"
                alt="${item.product}"
            >`;
        element.setAttribute('data-id', idx);
        return element;
    }


    /**
     * Подготавливает элементы аналогов и сохраняет их в json формате.
     *
     * element - элемент analogues-block в котором будут сохранены подготовленные элементы размеров.
     * analogues - массив данных о аналогов полученные с бэка.
     */ 
    const addAnaloguesElements = (element, analogues) => {
        const prepared_sets = [];
        analogues.forEach((item, idx) => {
            const sizeElement = addAnaloguesElement(idx, item['fields']);
            prepared_sets.push({ 'id': idx, 'element': sizeElement.outerHTML });
        });
        element.setAttribute('data-json', JSON.stringify(prepared_sets));
    }


    /**
     * Подготавливает аналоги и сохраняет их в json формате.
     *
     * idx - индекс элемента.
     * item - данные изображений полученные с бэка.
     */
    const addAnaloguesElement = (idx, item) => {
        const element = document.createElement("a");
        element.href = `/catalog/product/${item.product}/`;
        element.classList.add('product__analogues-block__imgs');
        element.target="_blank";
        element.innerHTML = 
            `<img
                src="/media/${item.image}"
                class="
                    img-fluid
                    img-thumbnail
                    thumbnail-50
                    product__thumbnail__block--design
                    product__thumbnail__block--position"
                alt="${item.product}"
            >`;
        element.setAttribute('data-id', idx);
        return element;
    }

    if(document.location.pathname.indexOf("/catalog/product/") === -1){
        return;    
    }

    const productIds = []
    const elements = document.querySelectorAll('.good-block');
    for (var j=0; j<elements.length; j++) {
        const productId = JSON.parse(elements[j].getAttribute('data-json'));
        if (productId) productIds.push(productId['id']);
    }

    if (productIds.length == 0) {
        return
    }

    updateProductsStatusStyle();

    productStocksAndCosts(productIds.toString())
    .then((data) => {
        return updateElements(data);
    })
    .then((data) => {
        return updateCarts(data);
    })
    .catch((error) => {
        alert('Ошибка обновления карточки товара: ' + error);
    });

    productSets(productIds.toString())
        .then((data) => {
            if (data['replay'] == 'error') throw new Error(data['message']);
            
            addSetElements(
                document.querySelector('#set-block'),
                JSON.parse(data['product_sets'])
            );
            showSets();

        })
        .catch((error) => {
            alert('Ошибка получения комплектующих: ' + error);    
        });

    productAnalogues(productIds.toString())
        .then((data) => {
            if (data['replay'] == 'error') throw new Error(data['message']);
            
            addAnaloguesElements(
                document.querySelector('#analogues-block'),
                JSON.parse(data['product_analogues'])
            );
            showAnalogues();

        })
        .catch((error) => {
            alert('Ошибка получения аналогов: ' + error);    
        });
}


const selectProductDetails = (element) => {
    const productDetailElements = document.querySelectorAll('.product-details');
    for (var i=0; i < productDetailElements.length; i++) {
        const formElement = document.getElementById(`${productDetailElements[i].name}Form`);
        if (formElement) formElement.style = 'display: none;'
        productDetailElements[i].classList.remove('active');
        if (productDetailElements[i] == element) {
            productDetailElements[i].classList.add('active');
            if (formElement) formElement.style = 'display: block;'
            continue;
        }
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


const updateOrder = () => {

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

    orderId = window.location.pathname.split('/').reverse().find(x=>x!=='');

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
                        currentTarget.setAttribute('data-json', JSON.stringify(el));
                        productField = document.querySelector(`#${currentTarget.id.replace('nomenclature', 'product')}`);
                        productField.innerHTML = `<option value="${el['pk']}" selected>${el['fields']['name']}</option>`;
                        updateOrderItem(productField);
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


const changeMainImg = (element) => {
    mainImgElement = document.querySelector('.main-image');
    mainImgElement.src = element.src;
}


const addEvents = () => {

    // $('.order-row').click((event) => {
    //     window.document.location = event.currentTarget.dataset.href
    // });

    const showElement = (elementId, show) => {
        document.getElementById(elementId).style.display = show ? 'block' : 'none';
    }

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

    $('.filter-control').on('change', (event) => {
        data = {'brand': [], 'collection': []};
        const allFilters = document.querySelectorAll('.filter-control');
        allFilters.forEach((element) => {
            if (!element.value) return;
            if (element.value == 'brand' || element.value == 'collection') {
                if (!element.checked) data[element.value].push(element.id);
            } else {
                data[`${element.name}`] = element.value;
            }
        });

        localStorage.setItem('excludedВrands', data.brand);
        localStorage.setItem('excludedCollection', data.collection);
        sessionStorage.setItem(
            'filters',
            JSON.stringify(Object.fromEntries(
                Object.entries(data).filter(
                    item => !['brand', 'collection'].includes(item[0])
        ))));
        
        updateProducts('products', {
            'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
            'data': JSON.stringify(data)
        });
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
    setProductPrice();

    // orders
    updateOrder()

    // events
    addEvents();
})


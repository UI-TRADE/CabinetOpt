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


const createBrandAndCollectionLists = () => {

    const fillCollectionTree = (collections, collectionElement, excludedCollection) => {

        const groups = []; 
        const excludedCollections = excludedCollection.split(','); 
        
        collections.forEach((item) => {
            if (!groups.find(el => el == item.group_name)) groups.push(item.group_name)
        });
       
        groups.forEach((group) => {
            innerHTML = 
            `<li class="list-group-item"><span class="collection-box">${group}</span>
                <ul class="collection-nested list-group list-group-flush">`;
    
            const foundCollections = collections.filter(el => el.group_name == group);
            foundCollections.forEach((collection) => {
                const checked = (excludedCollections.find(el => el === `collection-${collection['id']}`)) ? "" : "checked"
                innerHTML += 
                    `<li class="list-group-item" style="padding-top: 5px; padding-bottom: 5px; margin-left: 25px;">
                        <input class="form-check-input me-1 switch-change" type="checkbox" value="collection" id="collection-${collection['id']}" ${checked}>
                        <label class="form-check-label" for="collection-${collection['id']}" style="font-size: smaller;">${collection['name']}</label></li></ul></li>`;
    
                collectionElement.innerHTML += innerHTML;
    
            });
        });
    }    

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

    fillCollectionTree(loadJson('#collections'), document.querySelector('.collection-group'), excludedCollection);

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
            updateElement('li[name="cart_detail"]');
        },
        error: function(xhr, status, error) {
            alert('Ошибка: ' + error);
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

        let currentPrice = 0; let currentDiscount = 0; let inStok = 0;
        const product = products.find(el => el['pk'] == productId);
        const collection = collections.find(el => el['id'] == productId);
        const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == productId);
        const actual_price = actual_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(el => true);

        const defaultSize = getDefaultSize(
            productId, collection['collection_group'],
            stock_and_cost, product['fields'].gender
        )

        if (actual_price) { 
            currentPrice = actual_price['fields'].price;
            currentDiscount = actual_price['fields'].discount;
        }
        
        return {
            'defaultSize': defaultSize['fields'],
            'currentPrice': currentPrice,
            'currentDiscount': currentDiscount,
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

                const itemParams = getItemParams(data, productId);
                const defaultSize = itemParams.defaultSize

                nomenclature_sizeField.innerHTML = '';
                addSize(nomenclature_sizeField, 0, '--');

                if (defaultSize) {
                    weightField.value = defaultSize.weight; sizeField.value = defaultSize.size;
                    currentPrice = calculatePrice(
                        itemParams.currentPrice, defaultSize.cost,
                        itemParams.currentDiscount, (itemParams.unit == '163') ? defaultSize.weight : 0
                    );

                    const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == productId);
                    stock_and_cost.filter(el => el['fields'].size).forEach((item) => {
                        addSize(
                            nomenclature_sizeField, item['fields'].size, item['fields'].size,
                            (item['fields'].size == defaultSize.size), item
                        );
                    });

                } 
                priceField.value = currentPrice;
                sumField.value = quantityField.value * currentPrice;
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
                const defaultSize = itemParams.defaultSize

                if (defaultSize) {
                    weightField.value = defaultSize.weight; sizeField.value = defaultSize.size;
                    currentPrice = calculatePrice(
                        itemParams.currentPrice, defaultSize.cost,
                        itemParams.currentDiscount, (itemParams.unit == '163') ? defaultSize.weight : 0
                    );
                } 
                priceField.value = currentPrice;
                sumField.value = quantityField.value * currentPrice;                

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
                const defaultSize = itemParams.defaultSize

                if (defaultSize) {
                    weightField.value = defaultSize.weight; sizeField.value = defaultSize.size;
                    currentPrice = calculatePrice(
                        itemParams.currentPrice, defaultSize.cost,
                        itemParams.currentDiscount, (itemParams.unit == '163') ? defaultSize.weight : 0
                    );
                }

                priceField.value = currentPrice;
                sumField.value = quantityField.value * currentPrice;                

            })
            .catch((error) => {
                alert('Ошибка: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'quantity') {
        sumField.value = priceField.value * element.value;
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


const updateCartItem = (element) => {

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
                            const reloadHtml = new DOMParser().parseFromString(response, 'text/html');
                            const allCartKeys = reloadHtml.querySelectorAll('[name="cart-key"]');
                            for(var i=0; i<allCartKeys.length; i++) {
                                if (allCartKeys[i].textContent == cartKey.textContent) break;
                            }
                            cartRow.outerHTML = allCartKeys[i].parentElement.outerHTML;
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


const OnQuantityChange = (element) => {

    const getCartKey = (element, i) => {
        if (i >= 5) return ""; i++;
        const foundElement = element.querySelector('[name="cart-key"]');
        if (foundElement) {
            return JSON.parse(foundElement.textContent);
        }
        return getCartKey(element.parentElement, i);
    }

    if (element.value == 0) {
        const cartKey = getCartKey(element, 0);
        $.ajax({
            url: `/cart/remove/${cartKey.productId}/${cartKey.size}/`,
            success: (response) => {
                const cartRows = document.querySelectorAll('[name="cart-row"]');
                cartRows.forEach((cartRow) => {
                    if (cartRow.contains(element)) {
                        cartRow.outerHTML = '';
                    }
                });
            },
            error: (xhr, status, error) => {
                alert('Ошибка: ' + error);
            }
        });
    } else {
        updateCartItem(element);    
    }   
}


const calculatePrice = (currentPrice, maxPrice, discount, weight=0) => {
    if (parseFloat(maxPrice) > 0) {
        if (weight) {
            currentPrice = (parseFloat(maxPrice) * weight).toFixed(2);
        } else {
            currentPrice = parseFloat(maxPrice);
        }
    }
    if (discount > 0) {
        currentPrice = currentPrice - (currentPrice * discount / 100)   
    }
    return currentPrice;  
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
            defaultSize = 20;
            if (gender == 'женский' | gender == 'Ж') {
                defaultSize = 17;    
            }
        }
        if (['цепь', 'цепи', 'цепочка', 'цепочек'].find(el => el == collection)) {
            defaultSize = 50;
        }
    }

    const foundSizes = sizes.filter(el => el['fields'].product == productId && el['fields'].size == defaultSize);
    return foundSizes.sort((firstItem, nextItem) => {
        if (firstItem['fields'].weight < nextItem['fields'].weight) return 1;
        if (firstItem['fields'].weight > nextItem['fields'].weight) return -1;
        return 0;
    }).find(item => true);

}


const setProductsPrice = () => {

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
            if (data['replay'] == 'error') throw new Error(data['message']);

            const products         = JSON.parse(data['products']);
            const collections      = JSON.parse(data['collection']);
            const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
            const actual_prices    = JSON.parse(data['actual_prices']);

            for (var i=0; i < elements.length; i++) {
                let currentPrice = 0; let currentDiscount = 0; let inStok = 0;
                const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                const product = products.find(el => el['pk'] == currentId['id']);
                const collection = collections.find(el => el['id'] == currentId['id']);
                const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == currentId['id']);
                const actual_price = actual_prices.filter(
                    el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                ).find(el => true);

                const defaultSize = getDefaultSize(
                    currentId['id'],
                    collection['collection_group'],
                    stock_and_cost,
                    product['fields'].gender
                )

                if (actual_price) { 
                    currentPrice = actual_price['fields'].price;
                    currentDiscount = actual_price['fields'].discount;
                }

                if (defaultSize) {
                    currentPrice = calculatePrice(
                        currentPrice,
                        defaultSize['fields'].cost,
                        currentDiscount,
                        (product['fields'].unit == '163') ? defaultSize['fields'].weight : 0
                    );
                    const priceBlock = elements[i].querySelector('.price-block');
                    if (currentPrice > 0) priceBlock.querySelector('.price').textContent = `Цена: ${currentPrice} руб.`;
                    if (product['fields'].unit == '163' && defaultSize['fields'].weight > 0) {
                        priceBlock.querySelector('.weight').textContent = 
                            `Вес: ${defaultSize['fields'].weight} грамм`;
                    }
                    if (defaultSize['fields'].stock > 0) priceBlock.querySelector('.in_stock').textContent = 
                        `В наличии: ${defaultSize['fields'].stock} шт.`;

                    var inputFields = priceBlock.getElementsByTagName('input');
                    for (let item of inputFields) {
                        if (item.name === 'price' && currentPrice) {
                            item.value = currentPrice;    
                        }
                        if (item.name === 'size' && defaultSize['fields'].size) {
                            item.value = defaultSize['fields'].size;
                        }
                        if (item.name === 'weight' && defaultSize['fields'].weight) {
                            item.value = defaultSize['fields'].weight;
                        }
                    }
                }

            }
        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });
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

    if(document.location.pathname.indexOf("/catalog/product/") === -1){
        return;    
    }
    
    const updateSize = (product, size, price, discount) => {

        const element = document.getElementById(`good-block-${product['pk']}`);
        if (size.weight) element.querySelector('#weigth-block').outerHTML =
            `<b id="weigth-block"> ${size.weight} </b>`;
        currentPrice = calculatePrice(
            price, size.cost, discount,
            (product['fields'].unit == '163') ? size.weight : 0
        );
        if (currentPrice) element.querySelector('#price-block').outerHTML =
            `<b id="price-block"> ${currentPrice} </b>`;
        if (size.stock) element.querySelector('#in_stock').outerHTML = 
            `<b id="in_stock"> ${size.stock} </b>`;

        var inputFields = element.querySelector('form').querySelectorAll('input');
        for (let item of inputFields) {
            if (item.name === 'price' && currentPrice) {
                item.value = currentPrice;    
            }
            if (item.name === 'size' && size.size) {
                item.value = size.size;
            }
            if (item.name === 'weight' && size.weight) {
                item.value = size.weight;
            }
        }
    }

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
            if (data['replay'] == 'error') throw new Error(data['message']);

            const products         = JSON.parse(data['products']);
            const collections      = JSON.parse(data['collection']);
            const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
            const actual_prices    = JSON.parse(data['actual_prices']);

            for (var i=0; i < elements.length; i++) {
                let currentPrice = 0; let currentDiscount = 0; let inStok = 0;
                const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                const product = products.find(el => el['pk'] == currentId['id']);
                const collection = collections.find(el => el['id'] == currentId['id']);
                const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == currentId['id']);
                const actual_price = actual_prices.filter(
                    el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                ).find(el => true);

                const defaultSize = getDefaultSize(
                    currentId['id'],
                    collection['collection_group'],
                    stock_and_cost,
                    product['fields'].gender
                )

                if (actual_price) { 
                    currentPrice = actual_price['fields'].price;
                    currentDiscount = actual_price['fields'].discount;
                }

                if (defaultSize) { 
                    updateSize(product, defaultSize['fields'], currentPrice, currentDiscount);

                    if (defaultSize['fields'].size) {
                        const sizeElements = elements[i].querySelector('#size-block');
                        stock_and_cost.forEach((item) => {
                            if (!item['fields'].size) return;
                            item['currentPrice'] = currentPrice;
                            item['currentDiscount'] = currentDiscount;
                            const sizeElement = document.createElement("div");
                            sizeElement.classList.add('col');
                            sizeElement.classList.add('text-center');
                            sizeElement.classList.add('product__size__block');
                            sizeElement.classList.add('product__size__block--design');
                            sizeElement.classList.add('product__size__block--position');
                            if (item['fields'].size == defaultSize['fields'].size) 
                                sizeElement.classList.add('product__size__block--select');
                            sizeElement.setAttribute('data-json', JSON.stringify(item));
                            sizeElement.textContent = item['fields'].size;

                            sizeElement.addEventListener('click', (event) => {
                                const boundInfo = JSON.parse(event.target.getAttribute('data-json'));
                                updateSize(
                                    product,
                                    boundInfo['fields'],
                                    boundInfo['currentPrice'],
                                    boundInfo['currentDiscount']
                                );
                                const toggler = document.getElementsByClassName('product__size__block');
                                for (var k=0; k<toggler.length; k++) {
                                    if (toggler[k].classList.contains('product__size__block--select')) {
                                        toggler[k].classList.remove('product__size__block--select');    
                                    }
                                }
                                event.target.classList.add('product__size__block--select');
                            });
                            
                            sizeElements.appendChild(sizeElement);
                            
                        });
                    }
                }
            }
        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });
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
            const actual_prices    = JSON.parse(data['actual_prices']);

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

    // forms
    updateContactView('contactForm');
    updateCartView('cartView');

    // products
    createBrandAndCollectionLists();
    setProductPrice();

    // orders
    updateOrder()

    // events
    addEvents();
})


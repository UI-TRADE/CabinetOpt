import getPrice from './price'
import {сartEvents, waitUpdateCart} from './cart';


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
 * Добавляет обработчк события выбора размера.
 * 
 * element   - выбранный элемент DOM.
 */
const addSelectSizeEvent = (element) => {
    const boundInfo = JSON.parse(element.parentElement.getAttribute('data-json'));
    if (!boundInfo) return;
    const boundFields = boundInfo['fields'];
    if (!boundFields) return;
    const currentSize = boundFields.size.find(_ => true);
    updatePriceInProductCard({
            'size': currentSize, 'weight': boundFields.weight,
            'inStok': boundFields.stock, 'price': boundInfo['clientPrice'],
            'discount': boundInfo['clientDiscount'], 'maxPrice': boundInfo['clientMaxPrice']
    });
    removeClass(document, 'product__block__size-btn'  , 'product__block__size-btn--selected');
    removeClass(document, 'product__block__size-label', 'product__block__size-label--selected');
    element.classList.toggle('product__block__size-btn--selected');
    element.parentElement.querySelector('label').
        classList.toggle('product__block__size-label--selected');
    
    const elementOfPrices = document.querySelector('.product__col__prices');
    if (!elementOfPrices) return;
    waitUpdateCart(elementOfPrices, {'productId': boundFields['product'], 'size': currentSize})
        .catch(error => {
            alert('Ошибка обновления корзины покупок: ' + error);
        })
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

    const sizeBackElement = '<div id="size-back"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const sizeNextElement = '<div id="size-next"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

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
    });
    $('#size-back').on('click', (event) => {
        backSize(event.currentTarget.id);
    });
    $('#size-next').on('click', (event) => {
        nextSize(event.currentTarget.id);
    });
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

    const backElement = '<div id="set-back"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const nextElement = '<div id="set-next"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

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
    $('#set-back').on('click', (event) => {
        backSets(event.currentTarget);
    });
    $('#set-next').on('click', (event) => {
        nextSets(event.currentTarget);
    });
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

    const backElement = '<div id="analogues-back"><i class="fa fa-caret-left fa-2x" aria-hidden="true" style="padding-top: 8px; padding-right: 5px; color: gainsboro;"></i></div>';
    const nextElement = '<div id="analogues-next"><i class="fa fa-caret-right fa-2x" aria-hidden="true" style="padding-top: 8px; padding-left: 5px; color: gainsboro;"></i></div>';

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
    $('#analogues-back').on('click', (event) => {
        backAnalogues(event.currentTarget);
    });
    $('#analogues-next').on('click', (event) => {
        nextAnalogues(event.currentTarget);
    });
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


const changeMainImg = (element) => {
    const mainImgElement = document.querySelector('.main-image');
    if (mainImgElement) mainImgElement.src = element.src;
}

/**
 * Действия при рендеринге карточки номенклатуры.
 * 
 *  - без параметров.
 */
function updateProductCard() {

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

    const updateElements = (data) => {
        return new Promise((resolve, reject) => {
            try {
                if (data['replay'] == 'error') throw new Error(data['message']);

                const cartElementsForUpdate = [];
                const products         = JSON.parse(data['products']);
                const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                const actual_prices    = JSON.parse(data['actual_prices']);
                const discount_prices  = JSON.parse(data['discount_prices']);
                const default_sizes    = JSON.parse(data['default_sizes']);
    
                for (var i=0; i < elements.length; i++) {
                    let inStok = 0; let weight = 0; let size = '';
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
                    const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                    const product = products.find(el => el['pk'] == currentId['id']);
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product == currentId['id']);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const defaultSize = default_sizes.filter(
                        el => el['fields'].product == currentId['id']
                    ).find(_ => true);

                    const firstStockAndCost = stock_and_cost.find(_ => true);
                    if (firstStockAndCost) {
                        maxPrice = firstStockAndCost['fields'].cost;
                        weight = firstStockAndCost['fields'].weight;
                        inStok = firstStockAndCost['fields'].stock;    
                    }
    
                    if (defaultSize) {
                        maxPrice = defaultSize['fields'].cost;
                        weight = defaultSize['fields'].weight;
                        size = defaultSize['fields'].size.find(_ => true);
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
    
                    if (size) {
                        const sizeElements = elements[i].querySelector('#size-block');
                        if (stock_and_cost && sizeElements) {
                            sizeElements.style.display = 'flex';
                            addSizeElements(
                                sizeElements, stock_and_cost,
                                currentPrice, currentDiscount,
                                maxPrice, size
                            );
                        }
                        showSizes();
                    }
    
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

    const updateProductAttributes = (productId) => {
        const accessories = new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/product/accessories',
                data: {'productId': productId},
                success: (response) => {
                    if (response['replay'] == 'error') throw new Error(response['message']);
                    addSetElements(
                        document.querySelector('#set-block'),
                        JSON.parse(response['product_sets'])
                    );
                    showSets();
                    resolve(true);
                },
                error: () => {
                    reject(false);
                }
            });
        });

        const analogues = new Promise((resolve, reject) => {
            $.ajax({
                url: '/catalog/product/analogues',
                data: {'productId': productId},
                success: (response) => {
                    if (response['replay'] == 'error') throw new Error(response['message']);
                    addAnaloguesElements(
                        document.querySelector('#analogues-block'),
                        JSON.parse(response['product_analogues'])
                    );
                    showAnalogues();
                    resolve(true);
                },
                error: () => {
                    reject(false);
                }
            });
        });

        return new Promise((resolve, reject) => {
            try {
                const result = Promise.all([accessories, analogues]);
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
            const sizeElement = addSizeElement(idx, itemFields.size.find(_ => true), itemFields.weight);
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

    /**
     * Доюавляет обработчки события выбора пунктов и нформкации о продукте.
     */
    const addInfoTabsEvents = () => {
        const infoTabsElement = document.querySelector('#product-info-tabs');
        if (!infoTabsElement) return;

        const infoLinksElements = infoTabsElement.querySelectorAll('a');
        for (var i=0; i<infoLinksElements.length; i++) {
            infoLinksElements[i].addEventListener('click', (event) => {
                selectProductDetails(event.currentTarget);
            });  
        }
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

    const priceBlockFake = document.querySelector('#fake-col');
    const priceBlock     = document.querySelector('.product__col__prices');

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
        .then((result) => {
            if (result.every(Boolean)) {
                $('.product__thumbnail__block').on('click', (event) => {
                    changeMainImg(event.currentTarget);
                });
                сartEvents();
                addInfoTabsEvents();
                priceBlockFake.style.display = 'none';
                priceBlock.style.display     = 'flex';
            };
        })
        .then(() => {
            return updateProductAttributes(productIds.toString());
        })
        .catch((error) => {
            alert('Ошибка обновления карточки товара: ' + error);
        });
}


export default updateProductCard;

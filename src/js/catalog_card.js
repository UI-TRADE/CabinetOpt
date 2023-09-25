import getPrice from './price'
import {сartEvents, waitUpdateCart} from './cart';
import slick from "slick-carousel"
import {decimalFormat} from "./utils/money_format";

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



// data-ride="carousel"
const sliderTemplateFn = (items, name, slidesToShow, slidesToScroll) => `
    <div id="${name}-carousel" class="slider" data-slick='{"slidesToShow": ${slidesToShow}, "slidesToScroll": ${slidesToScroll}}'  >
        ${items.map((item, index) => 
           `<div class="slide ${index === 0 ? 'active' : ''}">${item.element}</div>`
        ).join('')}
    </div>
`;

/**
 * Отображает таблицу размеров и весов в карточке товаров.
 */
const showSizes = async (stock_and_cost) => {
    const sizeBlock = $('#size-block');
    const sizeElements = sizeBlock.data('json');
    const carouselSizes = $(sliderTemplateFn(sizeElements, 'sets', 8, 1));
    carouselSizes.addClass('hidden')
    sizeBlock.append(carouselSizes);

    await updateCarts(stock_and_cost.map((item) => {
        return {
            element: $('#size-' + item.fields.size[0], carouselSizes).get(0),
            key: {
                productId: item.fields.product[1],
                size: item.fields.size[0]
            }
        }
    }));
    carouselSizes.removeClass('hidden')
    sizeBlock.append(carouselSizes);
    $('.slider', sizeBlock).slick({
        infinite:false,
        variableWidth: true,
        prevArrow: '<button type="button" class="slick-prev"></button>',
        nextArrow: '<button type="button" class="slick-next"></button>'
    })

}

/**
 * Управляет отображением элементов прокрутки комплектов.
 */
// data-ride="carousel"
const showSets = () => {
    const setBlock = $('#set-block');
    const setElements = setBlock.data('json');
    const carouselSets = $(sliderTemplateFn(setElements, 'sets', 2, 1));
    setBlock.append(carouselSets);

    $('.slider', setBlock).slick({
        prevArrow: '<button type="button" class="slick-prev"></button>',
        nextArrow: '<button type="button" class="slick-next"></button>'
    })
}

// data-ride="carousel"


const showAnalogues = () => {

    const analoguesBlock = $('#analogues-block');
    const analoguesElements = analoguesBlock.data('json');

    const carouselAnalogues = $(sliderTemplateFn(analoguesElements, 'analogues', 2, 1));
    analoguesBlock.append(carouselAnalogues)
    $('.slider', analoguesBlock).slick({
        prevArrow: '<button type="button" class="slick-prev"></button>',
        nextArrow: '<button type="button" class="slick-next"></button>'
    })
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
        `<p id="price-block">${decimalFormat(Math.ceil(price.clientPrice))} <i class="fa fa-rub" aria-hidden="true"></i></p>`;
    if (parseFloat(price.maxPrice) && maxPriceElement) {
        maxPriceElement.outerHTML = `<p id="max-price">${decimalFormat(Math.ceil(price.maxPrice))} <i class="fa fa-rub" aria-hidden="true"></i></p> `;
    } else {
        maxPriceElement.parentElement.style.display = 'none';
    }
    if (context.price && pricePerweightField) pricePerweightField.outerHTML =
        `<p id="price-per-weight">${decimalFormat(Math.ceil(context.price))} руб/гр.</p>`;
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

const updateCarts = (cartElements) => {
    return new Promise((resolve, reject) => {
        try {
            const result = Promise.all(
                cartElements.map((item) => {
                    return waitUpdateCart(item.element, item.key)
                })
            );
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
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
                    const stock_and_cost = stocks_and_costs.filter(el => el['fields'].product[1] == currentId['id']);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product[1] == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product[1] == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const defaultSize = default_sizes.filter(
                        el => el['fields'].product[1] == currentId['id']
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
                            addSizeElements(
                                sizeElements, stock_and_cost,
                                currentPrice, currentDiscount,
                                maxPrice, size
                            );
                            showSizes(stock_and_cost)
                        }
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
            const sizeElement = addSizeElement(idx, itemFields.size.find(_ => true), itemFields.weight, item);
            sizes.push({ 'id': idx, 'element': sizeElement });
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
    const addSizeElement = (idx, size, weight = '0', item) => `
        <div id="size-${size}" class="product__block__sizes" data-size="${size}" data-id="${idx}" data-json="${JSON.stringify(item)}">
            
            <div class="product__block__group">
                <div class="product__block__group-title"><span>размер</span></div>
                <span type="button" class="btn btn-lg btn-primary size-button">${size}</span>
            </div>

            <div class="product__block__group product__block__group-weight">
                <div class="product__block__group-title"><span>вес, гр.</span></div>
                <div class="product__block__group-value">${weight}</div>
            </div>
            
            <div class="product__block__group product__block__group-stock">
                <div class="product__block__group-title"><span>остаток, шт.</span></div>
                <div class="product__block__group-value">${item.fields.stock}</div>
            </div>
            
            <div class="product__block__group product__block__group-size">
                <div class="product__block__group-title"><span>ваш заказ, шт.</span></div>
                <div class="product__block__group-value">
                    <div class="input" name="cart-row">
                        <div>
                            <a class="cart-element addOneToCart" href="#">+</a>
                        </div>
                        <input type="text" class="form-control" name="quantity" value="0"/>
                        <div>
                            <a class="cart-element delOneFromCart" href="#">-</a>
                        </div>
                        <input type="hidden" name="add-to-cart" />
                        <div name="cart-key" class="hidden"></div>
                    </div>
                </div>
            </div>
            
        </div>
    `

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
    const addSetElement = (idx, item) => `<a href="/catalog/product/${item.product}/"
            class="product__analogues-block__imgs"
            target="_blank"
            data-id="${idx}"
        >
            <img
                src="/media/${item.image}"
                class="img-fluid" alt="${item.product}"
            >
        </a>`


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
            prepared_sets.push({ 'id': idx, 'element': sizeElement });
        });
        element.setAttribute('data-json', JSON.stringify(prepared_sets));
    }



    /**
     * Подготавливает аналоги и сохраняет их в json формате.
     *
     * idx - индекс элемента.
     * item - данные изображений полученные с бэка.
     */
    const addAnaloguesElement = (idx, item) => `<a href="/catalog/product/${item.product}/"
        class="product__analogues-block__imgs"
        target="_blank"
        data-id="${idx}"
    >
        <img
            src="/media/${item.image}"
            class="img-fluid" alt="${item.product}"
        >
    </a>`

    if(document.location.pathname.indexOf("/catalog/product/") === -1){
        return;    
    }

    const productIds = []
    const elements = document.querySelectorAll('.good-block');
    for (var j=0; j<elements.length; j++) {
        const productId = JSON.parse(elements[j].getAttribute('data-json'));
        if (productId) productIds.push(productId['id']);
    }

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
            сartEvents();
            priceBlock.style.display     = 'flex';
        })
        .then(() => {
            return updateProductAttributes(productIds.toString());
        })
        .catch((error) => {
            alert('Ошибка обновления карточки товара: ' + error);
        });
}


export default updateProductCard;

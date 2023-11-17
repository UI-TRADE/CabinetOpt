import getPrice from './price'
import {cartEvents, removeElementFromCart, sendElementToCart, waitUpdateCart} from './cart';
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

const initAddingToCartEvents = (productData, productId) => {
    const $card = $('.product-cart-sizes-selection');
    const $addToCartBtn = $card.find('.product-detail__add-cart-btn');
    const $form = $(`#cartForm-${productId}`);
    const $slider = $card.find('.slick-list');
    const $totalCost = $card.find('.product-detail__price');
    const $totalCount = $card.find('.product-detail__total-items-count-in-cart span');
    const $totalWeight = $card.find('.product-detail__total-items-weight-in-cart span');
    const $countInputWrappers = $card.find('.sizes-selection__quantity-input-wrapper');
    const changedValues = {};
    const inputValues = {};
    const selectedIndexes = {};

    const sendCartData = () => {
        const keys = Object.keys(changedValues);
        if (!keys.length) {
            return;
        }
        const promises = [];

        let i = 0;
        const sendNext = () => {
            if (i === keys.length) {
                $.when(...promises).done(() => {
                    return $(document).data("cart").getProducts();
                });
                return ;
            }
            const key = keys[i];
            const data = productData.stockAndCosts[key];
            if (!changedValues[key].newValue) {
                if (!changedValues[key].prevValue) {
                    i += 1;
                    setTimeout(sendNext, 300);
                }
                promises.push(removeElementFromCart({
                    productId: productData.stockAndCosts[key].fields.product[1],
                    size: productData.stockAndCosts[key].fields.size[0]
                }));
            } else if (changedValues[key].prevValue && changedValues[key].newValue) {
                const formData = new FormData();
                formData.append('csrfmiddlewaretoken', $form.find('input[name="csrfmiddlewaretoken"]').val());
                formData.append('quantity', changedValues[key].newValue - changedValues[key].prevValue);
                formData.append('update', 'true');
                formData.append('size', data.fields.size[0]);
                promises.push(sendElementToCart(data.fields.product[1], formData));
            } else {
                const formData = new FormData();
                formData.append('csrfmiddlewaretoken', $form.find('input[name="csrfmiddlewaretoken"]').val());
                formData.append('quantity', changedValues[key].newValue);
                formData.append('update', 'false');
                formData.append('price', data.fields.cost);
                formData.append('unit', productData.product.fields.unit);
                formData.append('size', data.fields.size[0]);
                formData.append('weight', data.fields.weight);
                promises.push(sendElementToCart(data.fields.product[1], formData));
            }
            i += 1;
            setTimeout(sendNext, 300);
        }

        sendNext();
    };

    const updateSizeBtnSelection = ($input) => {
        const index = +$input.data('index');
        const $sizeBtn = $slider.find(`.btn[data-index=${index}]`);
        $sizeBtn.toggleClass('selected', !!(+$input.val()));
        if ($sizeBtn.hasClass('selected')) {
            selectedIndexes[index] = true;
        } else {
            delete selectedIndexes[index];
        }
    };

    const updateTotalInfo = () => {
        const { stockAndCosts } = productData;
        let totalCost = 0;
        let totalCount = 0;
        let totalWeight = 0;
        for (const key in selectedIndexes) {
            if (+inputValues[key]) {
                totalCost += +stockAndCosts[key].fields.cost * (+inputValues[key]);
                totalCount += +inputValues[key];
                totalWeight += +stockAndCosts[key].fields.weight * (+inputValues[key]);
            }
        }
        $totalCost.html(totalCost.toLocaleString());
        $totalCount.html(totalCount.toLocaleString());
        $totalWeight.html(totalWeight.toLocaleString());
    };

    const validateInput = ($input, data, initialInputValue) => {
        const index = +$input.data('index');
        const value = $input.val();
        $input.parent().toggleClass('error', !Number.isInteger(+value));
        const { stock } = data.fields;
        if (selectedIndexes[index]) {
            $input.parent().toggleClass('error', +value > +stock);
        }
        const newValue = selectedIndexes[index] ? +value : null;
        if (newValue !== +initialInputValue) {
            if (newValue || (+initialInputValue))
                changedValues[index] = {
                    newValue,
                    prevValue: +initialInputValue || null
                }
        } else {
            delete changedValues[index];
        }
        inputValues[index] = value;
        updateTotalInfo();
    };

    for (const key in productData.stockAndCosts) {
        const data = productData.stockAndCosts[key];
        const wrapper = $countInputWrappers[key];
        const $incrementButton = $(wrapper).find('.sizes-selection__quantity-input-spin-btn.increment');
        const $decrementButton = $(wrapper).find('.sizes-selection__quantity-input-spin-btn.decrement');
        const $input = $(wrapper).find('input');
        const initialInputValue = $input.val();
        $input.on('change', () => {
            if ($input.val() > 999) $input.val(999);
            updateSizeBtnSelection($input);
            validateInput($input, data, initialInputValue);
        });
        $incrementButton.click(() => {
            $input.val((_,val) => +val + 1 < 1000 ? +val+1 : 999);
            updateSizeBtnSelection($input);
            validateInput($input, data, initialInputValue);
        });
        $decrementButton.click(() => {
            $input.val((_,val) => +val - 1 > -1 ? +val-1 : 0);
            updateSizeBtnSelection($input);
            validateInput($input, data, initialInputValue);
        });
        updateSizeBtnSelection($input);
        validateInput($input, data, initialInputValue);
    }
    $addToCartBtn.click(sendCartData);
};

const initAddToCartButton = () => {
    const btn = $('.product-detail__add-cart-btn');
    btn.click(() => {
        window.open('/cart', '_self');
    });
};

// data-ride="carousel"
const sliderTemplateFn = (items, name) => `
    <div id="${name}-carousel" class="slider">
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
            element: $('#size-' + item.fields.size[item.fields.size.length-1], carouselSizes).get(0),
            key: {
                productId: item.fields.product[1],
                size: item.fields.size[0]
            }
        }
    }));

    carouselSizes.removeClass('hidden')
    sizeBlock.append(carouselSizes);
    $('.slider', sizeBlock).slick({
        draggable: false,
        infinite: false,
        nextArrow: `
            <button class="slick-next sizes-selection__slider-1-next" type="button" style="background-image: url('/static/img/arrow.svg')"></button>
            <button class="slick-next sizes-selection__slider-1-next" type="button" style="background-image: url('/static/img/arrow.svg')"></button>
        `,
        prevArrow: `
            <button class="slick-prev sizes-selection__slider-1-prev" type="button" style="background-image: url('/static/img/arrow.svg')"></button>
            <button class="slick-prev sizes-selection__slider-1-prev" type="button" style="background-image: url('/static/img/arrow.svg')"></button>
        `,
        respondTo: 'min',
        slidesToShow: 7,
        variableWidth: true,
    })

}

/**
 * Управляет отображением элементов прокрутки комплектов.
 */
// data-ride="carousel"
const showSets = () => {
    const setBlock = $('#set-block');
    const setElements = setBlock.data('json');
    if (!setElements.length) {
        setBlock.parent().addClass('hidden');
        return;
    }
    const carouselSets = $(sliderTemplateFn(setElements, 'sets'));
    setBlock.append(carouselSets);
    $('.slider', setBlock).slick({
        draggable: false,
        infinite: false,
        nextArrow: `<button class="slick-next product-detail__similar-products-carousel-arrow" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        prevArrow: `<button class="slick-prev product-detail__similar-products-carousel-arrow" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        respondTo: 'min',
        slidesToShow: 3,
        variableWidth: true,
    })
}

// data-ride="carousel"


const showAnalogues = () => {

    const analoguesBlock = $('#analogues-block');
    const analoguesElements = analoguesBlock.data('json');
    if (!analoguesElements.length) {
        analoguesBlock.parent().addClass('hidden');
        return;
    }
    const carouselAnalogues = $(sliderTemplateFn(analoguesElements, 'analogues', 2, 1));
    analoguesBlock.append(carouselAnalogues)
    $('.slider', analoguesBlock).slick({
        draggable: false,
        infinite: false,
        nextArrow: `<button class="slick-next product-detail__similar-products-carousel-arrow" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        prevArrow: `<button class="slick-prev product-detail__similar-products-carousel-arrow" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        respondTo: 'min',
        slidesToShow: 3,
        variableWidth: true,
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
        `<p id="price-block">
            <span class="product-detail__price">${decimalFormat(Math.ceil(price.clientPrice))}</span>
            <span class="product-detail__price-rub" aria-hidden="true">руб</span>
        </p>`;
    if (parseFloat(price.maxPrice) && maxPriceElement) {
        maxPriceElement.outerHTML = `<p id="max-price">${decimalFormat(Math.ceil(price.maxPrice))} <i class="fa fa-rub" aria-hidden="true"></i></p> `;
    } else {
        maxPriceElement.parentElement.style.display = 'none';
    }
    if (context.price && pricePerweightField) pricePerweightField.outerHTML =
        `<p id="price-per-weight">${decimalFormat(Math.ceil(context.price))} руб/гр.</p>`;

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
            const cart = $(document).data("cart");
                cart.getProducts()
                    .then(products => {
                        const result = Promise.all(
                            cartElements.map((item) => {
                                const product = products[item.key.productId  + '_' + item.key.size]
                                return waitUpdateCart(item.element, item.key, product)
                            })
                        );
                        resolve(result);
                    })
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
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product[1] == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const defaultSize = default_sizes.filter(
                        el => el['fields'].product[1] == currentId['id']
                    ).find(_ => true);
                    productData.product = product;
                    productData.stockAndCosts = stock_and_cost;

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

                    let sumOfStock = 0;
                    const inStokelement = document.querySelector('.good-block')?.querySelector('#in_stock');
                    const tagField = document.querySelector('[name="product-status"]');
                    stock_and_cost.forEach(item => {
                        sumOfStock += item['fields'].stock;
                    })
                    if (+inStok === 0) {
                        tagField.setAttribute('data-json', '{ "status": "order" }');
                    }
                    if (inStokelement) inStokelement.outerHTML =
                        `<span id="in_stock"> В наличии: ${sumOfStock} шт </span>`;

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
        const statusFields = document.querySelectorAll('div[name="product-status"]');
        statusFields.forEach((statusField) => {
            const data = JSON.parse(statusField.getAttribute('data-json'));
            if (!data) statusField.className += ' text-info';
            if (data.status === "novelty") statusField.className += ' text-info';
            if (data.status === "order") {
                statusField.className += ` badge badge-secondary ${data.status}__status`;
                $('b', statusField).text('на заказ')
            }
            if (data.status === "hit")     statusField.className += ' text-warning';
            if (data.status === "sale")    statusField.className += ' text-danger';
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
            item.clientPrice = price;
            item.clientDiscount = discount;
            item.clientMaxPrice = maxPrice;
            const itemFields = item['fields'];
            if (itemFields.size.length) {
                const sizeId = itemFields.size[itemFields.size.length-1];
                const sizeElement = addSizeElement(sizeId, itemFields.size.find(_ => true), itemFields.weight, item, idx);
                sizes.push({ 'id': sizeId, 'element': sizeElement });
            }
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
    const addSizeElement = (sizeId, size, weight = '0', item, idx) => `
        <div id="size-${sizeId}" class="product__block__sizes" data-size="${size}" data-id="${sizeId}" data-json="${JSON.stringify(item)}">
            <div class="product__block__group">
                <div class="sizes-selection__subtitle product__block__group-title"><span>размер, средний вес</span></div>
                <span class="btn font-weight-bold sizes-selection__select-btn size-button" data-index="${idx}">
                    ${size}
                </span>
                <div class="sizes-selection__select-btn-foot">
                    ${weight}
                </div>
            </div>
            <div class="product__block__group product__block__group-size">
                <div class="sizes-selection__subtitle product__block__group-title"><span>заказ, в наличии</span></div>
                <div class="product__block__group-value">
                    <div class="input" name="cart-row">
                        <div class="sizes-selection__quantity-input-wrapper">
                            <input
                                class="form-control font-weight-bold sizes-selection__quantity-input"
                                data-index="${idx}"
                                min="0"
                                max="999"
                                name="cart-quantity"
                                type="number"
                                value="0"
                            >
                            <button class="font-weight-bold sizes-selection__quantity-input-spin-btn increment">
                                <span class="font-weight-bold sizes-selection__quantity-input-spin-btn-text">+</span>
                            </button>
                            <button class="font-weight-bold sizes-selection__quantity-input-spin-btn decrement">
                                <span class="font-weight-bold sizes-selection__quantity-input-spin-btn-text">-</span>
                            </button>
                        </div>
                        <div class="sizes-selection__select-btn-foot">${item.fields.stock} шт</div>
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
    const addSetElement = (idx, item) => {
        const element = document.createElement("a");
        element.href = `/catalog/product/${item.product}/`;
        element.target="_blank";
        element.innerHTML =
            `<img
                src="/media/${item.image}"
                class="product-detail__similar-products-carousel-item"
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
        target="_blank"
        data-id="${idx}"
    >
        <img
            src="/media/${item.image}"
            class="product-detail__similar-products-carousel-item" alt="${item.product}"
        >
    </a>`

    if(document.location.pathname.indexOf("/catalog/product/") === -1){
        return;
    }

    const productData = {};
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

    productStocksAndCosts(productIds.toString())
        .then((data) => {
            return updateElements(data);
        })
        .then((data) => {
            return updateCarts(data);
        })
        .then((result) => {
            cartEvents();
            priceBlock.style.display     = 'flex';
        })
        .then(() => {
            updateProductsStatusStyle();
            return updateProductAttributes(productIds.toString());
        })
        .then(() => {
            initAddingToCartEvents(productData, productIds[0]);
        })
        .catch((error) => {
            alert('Ошибка обновления карточки товара: ' + error);
        });
}


export default updateProductCard;

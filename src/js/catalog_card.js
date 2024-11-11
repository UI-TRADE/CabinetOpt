import getPrice, {getUnitRepr} from './price'
import {
    cartEvents,
    waitUpdateCart,
    addSelectionSizesEvents,
    addSizeSlider
} from './cart';
import updateProductsStatusStyle from "./components/catalog_status";
import { weightFormat } from "./utils/weight_format";
import { decimalFormat } from "./utils/money_format";
import { handleError } from "./utils/exceptions";


const handleVideoPlayer = (control, action) => {
    if (action == 'play')
        $(control).attr("style", "display: none !important;");
    else
        $(control).attr("style", "display:  block !important;");
    
    const carouselItems = $('.img-form .carousel-item');
    $.each(carouselItems, (_, item) => {
        if ($(item).hasClass('active') && $(item).children('video').length) {
            if (action == 'play')
                $(item).children('video')[0].play();
            else if (action == 'pause')
                $(item).children('video')[0].pause();
        }
    });
}


export const productCardEvents = () => {

    const closeImgWindow = () => {

        const videos = $('.carousel-container video');
        $.each(videos, (_, videoItem) => {
            videoItem.play();
        });

        const carusels = $('.carousel-container').parent();
        $.each(carusels, (_, caruselItem) => {
            $(caruselItem).carousel();
        });

        const $modal = $('.img-form');
        $.each($modal.find('.carousel-item'), (_, item) => {
            $(item).removeClass('active');        
        });
        const $overlay = $('.background-overlay');
        $modal.addClass('hidden');
        $overlay.addClass('hidden');
        $overlay.off();
    };

    $('.main-image').on('click', (event) => {
        event.preventDefault();

        const videos = $('.carousel-container video');
        $.each(videos, (_, videoItem) => {
            videoItem.pause();
        });

        const carusels = $('.carousel-container').parent();
        $.each(carusels, (_, caruselItem) => {
            $(caruselItem).carousel('pause');
        });

        handleVideoPlayer($('.play-button')[0], 'pause');

        $('.background-overlay').removeClass('hidden');
        const $modal = $('.img-form');
        $.each($modal.find('.carousel-item'), (_, item) => {
            const $video = $(item).find('source');
            if ($video.length) {
                if ($video.attr('src') === $(event.currentTarget).find('source').attr('src')){
                    $(item).addClass('active');        
                }
            } else {
                const $img = $(item).find('img');
                if ($img.attr('src') === $(event.currentTarget).attr('src')){
                    $(item).addClass('active');        
                }
            }
        });

        $('.background-overlay').click(closeImgWindow);
        $modal.removeClass('hidden');

    });

    $('.img-form-nav-left').on('click', (event) => {

        const getCurrentIndex = ()=> {
            for(let i=0; i<=carouselItems.length-1; i++){
                if($(carouselItems[i]).hasClass('active')){
                    return i;    
                }   
            }
            return -1;
        }
        
        event.preventDefault();
        const $modal = $('.img-form');
        const carouselItems = $modal.find('.carousel-item');
        let currentIndex = getCurrentIndex(), nextIndex = 0;
        if(currentIndex > 0) nextIndex = currentIndex-1;
        else if(currentIndex === 0) nextIndex = carouselItems.length-1;
        else return;
        $(carouselItems[currentIndex]).removeClass('active');
        $(carouselItems[nextIndex]).addClass('active');
    });

    $('.img-form-nav-right').on('click', (event) => {

        const getCurrentIndex = ()=> {
            for(let i=0; i<=carouselItems.length-1; i++){
                if($(carouselItems[i]).hasClass('active')){
                    return i;    
                }   
            }
            return -1;
        }
        
        event.preventDefault();
        const $modal = $('.img-form');
        const carouselItems = $modal.find('.carousel-item');
        let currentIndex = getCurrentIndex(), nextIndex = 0;
        if(currentIndex < carouselItems.length-1) nextIndex = currentIndex+1;
        else if(currentIndex === carouselItems.length-1) nextIndex = 0;
        else return;
        $(carouselItems[currentIndex]).removeClass('active');
        $(carouselItems[nextIndex]).addClass('active');
    });

    $('.play-button').on('click', (event) => {
        handleVideoPlayer(event.currentTarget, 'play');
    });

}


// data-ride="carousel"
const sliderTemplateFn = (items, name) => `
    <div id="${name}-carousel" class="slider">
        ${items.map((item, index) => 
           `<div class="slide ${index === 0 ? 'active' : ''}">${item.element}</div>`
        ).join('')}
    </div>
`;


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
 * price     - объект содержащий расчитанные цены
 * 
 */
const updatePriceInProductCard = (context, price, unit) => {
    const element             = document.querySelector('.good-block');
    const weightField         = element.querySelector('.weight');
    const pricePerweightField = element.querySelector('#price-per-weight');
    const formElement         = element.querySelector('form');

    if (context.weight && weightField) {
        weightField.style.display = "inline-block"
        weightField.textContent = `${weightFormat(context.weight, 2)} г`
    }
    if (context.price && pricePerweightField) pricePerweightField.outerHTML =
        `<p id="price-per-weight">${decimalFormat(Math.ceil(context.price))} <span style="font-size: small;">руб/${getUnitRepr(unit)}</span></p>`;

    if (!formElement) return;
    var inputFields = formElement.querySelectorAll('input');

    for (let item of inputFields) {
        if (item.name === 'price' && price.clientPrice) item.value = price.clientPrice;
        if (item.name === 'size' && context.size)       item.value = context.size;
        if (item.name === 'weight' && context.weight)   item.value = context.weight;
    }
}


const updateCarts = (cartElements) => {
    return new Promise((resolve, reject) => {
        try {
            const cart = $(document).data("cart");
            cart.getProducts()
                .then(products => {
                    Promise.all(
                        cartElements.map((item) => {
                            const product = products[item.key.productId  + '_' + item.key.size]
                            return waitUpdateCart(item.element, item.key, product)
                        })
                    );
                    resolve(products);
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
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0; let currentUnit = '163';
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

                    if (product)
                        currentUnit = product['fields'].unit;

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
                        currentUnit = actual_price['fields'].unit;
                    }

                    if (discount_price) {
                        maxPrice = discount_price['fields'].price;
                        currentDiscount = discount_price['fields'].discount;
                    }

                    const calcPriceParams = {
                        'size': size,
                        'weight': weight,
                        'inStok': inStok,
                        'price': currentPrice,
                        'discount': currentDiscount,
                        'maxPrice': maxPrice
                    }
                    const price = getPrice(
                        calcPriceParams.price,
                        calcPriceParams.maxPrice,
                        calcPriceParams.discount,
                        calcPriceParams.weight,
                        currentUnit
                    );
                    updatePriceInProductCard(calcPriceParams, price, currentUnit);

                    let sumOfStock = 0;
                    const inStokelement = document.querySelector('.good-block')?.querySelector('#in_stock');
                    stock_and_cost.forEach(item => {
                        sumOfStock += item['fields'].stock;
                    });

                    if (inStokelement && sumOfStock > 0)
                        inStokelement.outerHTML = `<span id="in_stock"> В наличии: ${sumOfStock} шт </span>`;

                    addSelectionSizesEvents(currentId['id'], calcPriceParams.price, currentUnit);    
                    addSizeSlider($('.product-detail__sizes-container'), 6);

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


    // if(document.location.pathname.indexOf("/catalog/product/") === -1 || 
    //     document.location.pathname.indexOf("/cart/") === -1){
    //     return;
    // }

    const productIds = []
    const elements = document.querySelectorAll('.good-block');
    for (var j=0; j<elements.length; j++) {
        const productId = JSON.parse(elements[j].getAttribute('data-json'));
        if (productId) productIds.push(productId['id']);
    }
    if (productIds.length == 0) return;

    const priceBlock     = document.querySelector('.product__col__prices');
    productStocksAndCosts(productIds.toString())
        .then((data) => {
            return updateElements(data);
        })
        .then((data) => {
            return updateCarts(data);
        })
        .then((result) => {
            cartEvents();
            priceBlock.style.display = 'flex';
            return true;
        })
        .then((result) => {
            if (result) {
                updateProductsStatusStyle();
                updateProductAttributes(productIds.toString());
                return true;
            }
        })
        .then((result) => {
            if (result) {
                $(`#good-block-${productIds[0]}`).css('visibility', 'visible')
            }
        })
        .catch((error) => {
            handleError(error, 'Ошибка обновления карточки товара');
        });
}


export default updateProductCard;

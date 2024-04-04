import getPrice from './price'
import { extractContent, createSpiner, removeSpiner } from './lib';
import { updateFilterQuantitiesAndSums } from './catalog/filters';
import { cartEvents, waitUpdateCart } from './cart';
import { weightFormat } from "./utils/weight_format";
import { decimalFormat } from "./utils/money_format";
import { handleError } from "./utils/exceptions";
import lazyLoads from './components/lazyload';


/**
 * Действия при рендеринге каталога номенклатуры.
 *
 * element   - контейнер с каталогом номенклатуры.
 */
const updateProductCards = (element) => {
    const productsData = {};

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

                const elemsForUpdate   = []
                const products         = JSON.parse(data['products']);
                const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
                const actual_prices    = JSON.parse(data['actual_prices']);
                const discount_prices  = JSON.parse(data['discount_prices']);
                const default_sizes    = JSON.parse(data['default_sizes']);
                const available_stocks = JSON.parse(data['available_stocks']);
                productsData.products = products;
                productsData.stockAndCosts = stocks_and_costs;

                for (var i=0; i < elements.length; i++) {
                    let inStok = 0; let weight = 0; let size = '';
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
                    const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                    const product = products.find(el => el['pk'] == currentId['id']);
                    const stock_and_cost = stocks_and_costs.filter(
                        (el) => el['fields'].product[1] == currentId['id']
                    ).find(_ => true);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product[1] == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const defaultSize = default_sizes.filter(
                        el => el['fields'].product[1] == currentId['id']
                    ).find(_ => true);
                    const available_stock = available_stocks.filter(
                        el => el['product'] == currentId['id']
                    ).find(_ => true);

                    if (stock_and_cost) {
                        maxPrice = stock_and_cost['fields'].cost;
                        weight = stock_and_cost['fields'].weight;
                        // inStok = stock_and_cost['fields'].stock;
                    }

                    if (defaultSize) {
                        maxPrice = defaultSize['fields'].cost;
                        weight = defaultSize['fields'].weight;
                        size = defaultSize['fields'].size.find(_ => true);
                        // inStok = defaultSize['fields'].stock;
                    }
                    if (actual_price) {
                        currentPrice = actual_price['fields'].price;
                        currentDiscount = actual_price['fields'].discount;
                    }

                    if (discount_price) {
                        maxPrice = discount_price['fields'].price;
                        currentDiscount = discount_price['fields'].discount;
                    }

                    if (available_stock && available_stock['total_stock'] > 0) {
                        inStok = available_stock['total_stock'];    
                    }

                    const price = getPrice(currentPrice, maxPrice, currentDiscount, weight);

                    const inStockBlock        = elements[i].querySelector('.inStock-block');
                    const weightField         = elements[i].querySelector('.weight');
                    const pricePerweightField = elements[i].querySelector('.price-per-weight');
                    const stockField          = inStockBlock.querySelector('.in_stock');
                    if (currentPrice && pricePerweightField) 
                        pricePerweightField.innerHTML = `${decimalFormat(Math.ceil(currentPrice))} <span style="font-size: small;">руб/г</span>`;

                    if (weight && weightField) {
                        weightField.style.display = "inline-block"
                        weightField.textContent = `${weightFormat(weight, 2)} г`
                    }
                    if (inStok && stockField) stockField.textContent = `${inStok} шт`;

                    // if (+inStok === 0) {
                    //     tagField.setAttribute('data-json', '{ "status": "order" }');
                    // }

                    // Заполняем поля формы добавления в корзину
                    var inputFields = inStockBlock.getElementsByTagName('input');
                    for (let item of inputFields) {
                        if (item.name === 'price' && price.clientPrice) item.value = price.clientPrice;
                        if (item.name === 'size' && size) item.value = size;
                        if (item.name === 'weight' && weight) item.value = weight;
                    }

                    // Данные для диалогового окна выбора размеров
                    if (stock_and_cost && stock_and_cost['fields'].size?.find(_ => true)) {
                        currentId['unit'] = '163';
                        currentId['price'] = currentPrice;
                        elements[i].setAttribute('data-json', JSON.stringify(currentId));
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

    const initProductCardsCarousel = () => {
        const $carousels = $('.carousel');
        for (const carousel of $carousels) {
            const $carousel = $(carousel);
            $carousel.carousel({
                interval: 2000
            }).carousel('pause');
            $carousel.on('mouseenter', () => {
                $carousel.carousel('cycle');
            });
            $carousel.on('mouseleave', () => {
                $carousel.carousel(0).carousel('pause');
            });
        }
    };

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
                        ).then(() => {
                            // initProductCardsCarousel();
                        });
                        resolve(result);
                    })

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

    const elements = $('.good-block, .product-item').toArray() || []
    const productIds = elements.map((element) => {
        const productId = JSON.parse(element.getAttribute('data-json')).id;
        return productId
    })

    if (productIds.length == 0) {
        return
    }

    const currentSpin = createSpiner($('.main-content')[0]);
    productStocksAndCosts(productIds.toString())
        .then((data) => {
            return updateElements(data);
        })
        .then((data) => {
            return updateCarts(data);
        })
        .then(() => {
            cartEvents(productsData);
            element.style.visibility = 'visible';
            updateProductsStatusStyle();
            removeSpiner(currentSpin);
            lazyLoads();
        })
        .catch((error) => {
            removeSpiner(currentSpin);
            handleError(error, 'Ошибка обновления каталога');
        });
}


function updateProducts(elementId, data) {
    const mainElement = document.getElementById(elementId);
    if (!document.getElementById(elementId)) return;
    mainElement.style = "visibility: hidden;";
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (data) => {
            $(`#${elementId}`).html(
                extractContent(data, elementId)
            );
            updateFilterQuantitiesAndSums(data);
            updateProductCards(mainElement);
        },
        error: (error) => {
            handleError(error, 'Ошибка получения данных каталога с сервера');
        }
    });
}


export default updateProducts;

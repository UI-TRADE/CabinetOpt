import getPrice, {getUnitRepr} from './price'
import { extractContent, createSpiner, removeSpiner } from './lib';
import { updateFilterQuantitiesAndSums } from './catalog/filters';
import { cartEvents, waitUpdateCart } from './cart';
import { weightFormat } from "./utils/weight_format";
import { decimalFormat } from "./utils/money_format";
import { handleError } from "./utils/exceptions";
import updateProductsStatusStyle from "./components/catalog_status";
import lazyLoads from './components/lazyload';


const getSearchValues = (filters) => {
    if (!filters) return '';
    const searchFilter = filters.find(item => item['search_values'] != undefined);
    const searchValues = searchFilter?.search_values.find(_ => true);
    return searchValues || '';
}


const getEmptyCatalogPage = () => {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    const searchValues = getSearchValues(filters);
    if (!searchValues) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/catalog/search-error/',
            data: {'search_values': searchValues},
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
 * Действия при рендеринге каталога номенклатуры.
 *
 * element   - контейнер с каталогом номенклатуры.
 */
const updateProductCards = (element, ...params) => {
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

    const showSearchBadges = () => {
        const searchBadgesElement = $('.search-badges__list');
        searchBadgesElement.css('display', 'none');
        if (searchBadgesElement && params) {
            const searchValues = params.find(el => 'search_values' in el);
            if (!searchValues['search_values']) return;
            searchBadgesElement.text(`Найдено по запросу «${searchValues['search_values']}»`);
            searchBadgesElement.css('display', 'block');
        }
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
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0; let currentUnit = '163';
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

                    if (product)
                        currentUnit = product['fields'].unit;  

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
                        currentUnit = actual_price['fields'].unit;
                    }

                    if (discount_price) {
                        maxPrice = discount_price['fields'].price;
                        currentDiscount = discount_price['fields'].discount;
                    }

                    if (available_stock && available_stock['total_stock'] > 0) {
                        inStok = available_stock['total_stock'];    
                    }

                    const price = getPrice(currentPrice, maxPrice, currentDiscount, weight, currentUnit);

                    const inStockBlock        = elements[i].querySelector('.inStock-block');
                    const weightField         = elements[i].querySelector('.weight');
                    const pricePerweightField = elements[i].querySelector('.price-per-weight');
                    const stockField          = inStockBlock.querySelector('.in_stock');
                    if (currentPrice && pricePerweightField) 
                        pricePerweightField.innerHTML = `${decimalFormat(Math.ceil(currentPrice))} <span style="font-size: small;">руб/${getUnitRepr(currentUnit)}</span>`;

                    if (weight && weightField) {
                        weightField.style.display = "inline-block"
                        weightField.textContent = `${weightFormat(weight, 2)} г`
                    }

                    if (stockField) {
                         if (inStok > 0) {
                            stockField.outerHTML = `<span class="in_stock"> В наличии: ${inStok} шт </span>`;
                         }
                    }

                    // Заполняем поля формы добавления в корзину
                    var inputFields = inStockBlock.getElementsByTagName('input');
                    for (let item of inputFields) {
                        if (item.name === 'price' && price.clientPrice) item.value = price.clientPrice;
                        if (item.name === 'size' && size) item.value = size;
                        if (item.name === 'weight' && weight) item.value = weight;
                    }

                    // Данные для диалогового окна выбора размеров
                    if (stock_and_cost && stock_and_cost['fields'].size?.find(_ => true)) {
                        currentId['unit'] = currentUnit;
                        currentId['price'] = currentPrice;
                        elements[i].setAttribute('data-json', JSON.stringify(currentId));
                    }

                    elemsForUpdate.push(
                        {
                            'key': {'productId': currentId['id'], 'size': size},
                            'element': inStockBlock
                    });
                }

                showSearchBadges();
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

    const elements = $('.good-block, .product-item').toArray() || []
    const productIds = elements.map((element) => {
        const productId = JSON.parse(element.getAttribute('data-json')).id;
        return productId
    })

    const activeSpin = params.find(el => 'spiner' in el);
    if (!productIds.length) {

        const catalogContainer = $('#products');
        const searchBadgesElement = $('.search-badges__list');
        searchBadgesElement.css('display', 'none');
        getEmptyCatalogPage()
            .then((response) => {
                if (response) {
                    catalogContainer.html(response);
                    catalogContainer.css('visibility', 'visible');
                }
                if(activeSpin) removeSpiner(activeSpin['spiner']);
            })
            .catch((error) => {
                if(activeSpin) removeSpiner(activeSpin['spiner']);
                handleError(error, 'Ошибка обновления каталога');
            });
    
    } else {

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
                if(activeSpin) removeSpiner(activeSpin['spiner']);
                lazyLoads();
            })
            .catch((error) => {
                if(activeSpin) removeSpiner(activeSpin['spiner']);
                handleError(error, 'Ошибка обновления каталога');
            });

    }
}


function updateProducts(elementId, data, spiner=NaN) {
    const mainElement = document.getElementById(elementId);
    if (!document.getElementById(elementId)) return;
    mainElement.style = "visibility: hidden;";
    const searchFilter = getSearchValues(JSON.parse(data?.filters));
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (response) => {
            $(`#${elementId}`).html(
                extractContent(response, elementId)
            );
            updateFilterQuantitiesAndSums(response);
            updateProductCards(mainElement, {'search_values': searchFilter, 'spiner': spiner});
        },
        error: (error) => {
            if(spiner) removeSpiner(spiner);
            handleError(error, 'Ошибка получения данных каталога с сервера');
        }
    });
}


export default updateProducts;

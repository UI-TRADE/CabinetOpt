import getPrice from './price'
import {сartEvents, waitUpdateCart} from './cart';


const extractContent = (html, elementId) => {
    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
    return DOMModel.getElementById(elementId)?.innerHTML;
}

/**
 * Действия при рендеринге каталога номенклатуры.
 * 
 * element   - контейнер с каталогом номенклатуры.
 */
const updateProductCards = (element) => {

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

                for (var i=0; i < elements.length; i++) {
                    let inStok = 0; let weight = 0; let size = '';
                    let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
                    const currentId = JSON.parse(elements[i].getAttribute('data-json'));
                    const product = products.find(el => el['pk'] == currentId['id']);
                    const stock_and_cost = stocks_and_costs.filter(
                        el => el['fields'].product == currentId['id']
                    ).find(_ => true);
                    const actual_price = actual_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const discount_price = discount_prices.filter(
                        el => el['fields'].product == currentId['id'] && el['fields'].unit == product['fields'].unit
                    ).find(_ => true);
                    const defaultSize = default_sizes.filter(
                        el => el['fields'].product == currentId['id']
                    ).find(_ => true);

                    if (stock_and_cost) {
                        maxPrice = stock_and_cost['fields'].cost;
                        weight = stock_and_cost['fields'].weight;
                        inStok = stock_and_cost['fields'].stock;    
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
                        if (item.name === 'weight' && weight) item.value = weight;
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
            if (result.every(Boolean)) {
                сartEvents();
                element.style.display = 'block';
            }
        })
        .catch((error) => {
            alert('Ошибка обновления каталога: ' + error);
        });
}


function updateProducts(elementId, data) {
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
        error: (error) => {
            alert('Ошибка получения данных каталога с сервера: ' + error);
        }
    });
}

export default updateProducts;

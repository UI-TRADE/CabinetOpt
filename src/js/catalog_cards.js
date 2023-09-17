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
                    const weightField         = elements[i].querySelector('.weight');
                    const pricePerweightField =  elements[i].querySelector('.price-per-weight');
                    const maxPriceField       = priceBlock.querySelector('.max-price');
                    const discountField       = priceBlock.querySelector('.discount');
                    const stockField          = inStockBlock.querySelector('.in_stock');
                    if (currentPrice) pricePerweightField.innerHTML = `${currentPrice} <i class="fa fa-rub" aria-hidden="true"></i>/гр`;
                    if (price.clientPrice) priceField.innerHTML = `${price.clientPrice} <i class="fa fa-rub" aria-hidden="true"></i>`;
                    if (currentDiscount>0) {
                        if (price.maxPrice) maxPriceField.innerHTML = `${price.maxPrice} <i class="fa fa-rub" aria-hidden="true"></i>`;
                        discountField.textContent = `- ${currentDiscount} %`
                    };
                    if (product['fields'].unit == '163' && weight) {
                        weightField.style.display = "inline-block"
                        weightField.textContent = `Вес: ${weight} гр`
                    }else{
                        weightField.style.display = "none"
                    }
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
        const statusFields = document.querySelectorAll('div[name="product-status"]');
        statusFields.forEach((statusField) => {
            const data = JSON.parse(statusField.getAttribute('data-json'));
            if (!data) statusField.className += ' text-info';
            if (data.status === "novelty") statusField.className += ' text-info';
            if (data.status === "order")   statusField.className += ' text-info-emphasis';
            if (data.status === "hit")     statusField.className += ' text-warning';
            if (data.status === "sale")    statusField.className += ' text-danger';
        });
    }
    
    updateProductsStatusStyle();


    const elements = $('.good-block, .product-item').toArray() || []
    const productIds = elements.map((element) => {
        const productId = JSON.parse(element.getAttribute('data-json')).id;
        return productId
    })

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
                element.style.visibility = 'visible';
            }
        })
        .catch((error) => {
            alert('Ошибка обновления каталога: ' + error);
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
            updateProductCards(mainElement);
        },
        error: (error) => {
            alert('Ошибка получения данных каталога с сервера: ' + error);
        }
    });
}

export default updateProducts;

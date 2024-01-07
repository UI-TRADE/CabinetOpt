import getPrice from '../price';

export function updateOrderItem(element) {

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

    const getItemParams = (data, productId) => {
        const products         = JSON.parse(data['products']);
        const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
        const actual_prices    = JSON.parse(data['actual_prices']);
        const discount_prices  = JSON.parse(data['discount_prices']);
        const default_sizes    = JSON.parse(data['default_sizes']);

        let inStok = 0; let weight = 0; let size = ''; const sizes = [];
        let currentPrice = 0; let currentDiscount = 0; let maxPrice = 0;
        const product = products.find(el => el['pk'] == productId);
        const product_stocks_and_costs = stocks_and_costs.filter(el => el['fields'].product == productId);
        const stock_and_cost = product_stocks_and_costs.find(_ => true);
        const actual_price = actual_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const discount_price = discount_prices.filter(
            el => el['fields'].product == productId && el['fields'].unit == product['fields'].unit
        ).find(_ => true);
        const defaultSize = default_sizes.filter(el => el['fields'].product == productId).find(_ => true);

        if (stock_and_cost) {
            maxPrice = stock_and_cost['fields'].cost;
            weight = stock_and_cost['fields'].weight;
            inStok = stock_and_cost['fields'].stock;    
        }

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

        product_stocks_and_costs.forEach((item) => {
            const itemSize = item['fields'].size;
            if (itemSize) sizes.push({
                'value': itemSize[itemSize.length-1],
                'size': itemSize.find(_=>true),
                'stock_and_cost': item
            });
        });
        
        return {
            'weight': weight,
            'size': size,
            'inStok': inStok,
            'currentPrice': currentPrice,
            'currentDiscount': currentDiscount,
            'maxPrice': maxPrice,
            // 'unit': product['fields'].unit,
            'unit': '796',
            'sizes': sizes
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
    const prefId = partsOfId.slice(0, partsOfId.length-1).join('-');
    const productField           = document.getElementById(`${prefId}-product`);
    const nomenclature_sizeField = document.getElementById(`${prefId}-nomenclature_size`);
    const weightField            = document.getElementById(`${prefId}-weight`);
    const sizeField              = document.getElementById(`${prefId}-size`);
    const quantityField          = document.getElementById(`${prefId}-quantity`);
    const unitField              = document.getElementById(`${prefId}-unit`);
    const priceField             = document.getElementById(`${prefId}-price`);
    const sumField               = document.getElementById(`${prefId}-sum`);

    const selectedProdOption = productField.options[productField.selectedIndex];
    const productId = selectedProdOption.value;
    if (!productId) return;

    const selectedSizeOption = nomenclature_sizeField.options[nomenclature_sizeField.selectedIndex];
    const selectedSize = selectedSizeOption.textContent;

    if (partsOfId[partsOfId.length-1] === 'product') {
        productStocksAndCosts(productId)
            .then((data) => {
                nomenclature_sizeField.innerHTML = '';
                addSize(nomenclature_sizeField, '', '--');

                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                itemParams.sizes.forEach((item) => {
                    addSize(
                        nomenclature_sizeField, item.size, item.size,
                        (item.size === (itemParams.size) ? itemParams.size : ''), item.stock_and_cost
                    );    
                });
                Array.from(unitField.options).forEach((unitOption) => {
                    if (unitOption.value == itemParams.unit) unitOption.setAttribute('selected', true);
                });
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);
            })
            .catch((error) => {
                alert('Ошибка заполнения номенклатуры в строке заказа: ' + error);
            });
    }
    else if (['nomenclature_size', 'size'].indexOf(partsOfId[partsOfId.length - 1]) >= 0) {
        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                const price = getPrice(
                    itemParams.currentPrice, itemParams.maxPrice, itemParams.currentDiscount, itemParams.weight
                );
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);
                priceField.value = price.clientPrice;
                sumField.value = (parseFloat(quantityField.value) * price.clientPrice).toFixed(2);
                if (itemParams.size) {
                    const selectedSizeId = sizeField.options[sizeField.selectedIndex].value;
                    if (selectedSizeId !== itemParams.size[itemParams.size.length-1]) {
                        sizeField.innerHTML = `<option value="${itemParams.size[itemParams.size.length-1]}" selected="">${itemParams.size[0]}</option>`;
                    }    
                }  
            })
            .catch((error) => {
                alert('Ошибка заполнения размеров в строке заказа: ' + error);
            });
    }
    else if (partsOfId[partsOfId.length-1] === 'quantity') {
        sumField.value = (parseFloat(priceField.value) * parseFloat(element.value)).toFixed(2);
        productStocksAndCosts(productId, selectedSize)
            .then((data) => {
                const itemParams = getItemParams(data, productId);
                if (itemParams.weight) weightField.value = (itemParams.weight * quantityField.value).toFixed(2);                
            })
            .catch((error) => {
                alert('Ошибка расчета веса в строке заказа: ' + error);
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


export function autocomplete(element) {
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
                const foundData = JSON.parse(data);
                foundData.forEach((el) => {
                    const listItem = document.createElement("div");

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
                        const productField = document.querySelector(`#${currentTarget.id.replace('nomenclature', 'product')}`);
                        productField.innerHTML = `<option value="${el['pk']}" selected>${el['fields']['name']}</option>`;
                        updateOrderItem(productField);
                        closeAllLists();
                    });
                    autocompleteElement.appendChild(listItem);
                });
                event.target.parentElement.appendChild(autocompleteElement);
            })
            .catch((error) => {
                alert('Ошибка заполнения строки заказа: ' + error);
            });
    });

    element.addEventListener('keydown', (event) => {
        const currentTarget = event.target;
        if (!currentTarget.value) {
            closeAllLists();
            return
        }

        let autocompleteElement = document.getElementById(currentTarget.id + '__autocomplete-list');
        let autocompleteItems = [];

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

export default autocomplete;
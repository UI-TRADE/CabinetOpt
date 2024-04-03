import 'tablesorter';
import generateUUID from './lib';
import Cart from "./components/cart";
import updateProductCard from './catalog_card';
import { weightFormat } from "./utils/weight_format";
import { decimalFormat } from "./utils/money_format";
import { handleError } from "./utils/exceptions";


const closeAddToCartSettingsWindow = () => {
    const $card = $('.sizes-selection');
    const $overlay = $('.background-overlay');
    $card.html('');
    $card.addClass('hidden');
    $overlay.addClass('hidden');
    $overlay.off();
};


const closeProductEditingWindow = () => {
    const $card = $('.product-editing');
    const $overlay = $('.background-overlay');
    $card.html('');
    $card.addClass('hidden');
    $overlay.addClass('hidden');
    $overlay.off();
    location.reload();
};


//Обновление данных о корзине в каталоге 
export function updateTotalSizeInfo(productId, price, unit) {

    const $card        = $(`#sizes-selection-form-${productId}`);
    const $totalCost   = $card.find('.sizes-selection__sum');
    const $totalCount  = $card.find('.sizes-selection__total-count');
    const $totalWeight = $card.find('.sizes-selection__total-weight');
    const $inputs      = $card.find('input[name="sizes-selection-quantity-input"]');
    let totalCost = 0; let totalCount = 0; let totalWeight = 0;
    $inputs.each(idx => {
        const inputField = $inputs[idx];
        const selectedQuantity = Number($(inputField).val());

        if ( selectedQuantity ) {
            totalCount += selectedQuantity;
            totalWeight += (selectedQuantity * parseFloat($(inputField).attr('data-weight').replace(",", ".")));
            totalCost += (selectedQuantity * (totalWeight * price).toFixed(2));
        }
    });

    $totalCost.html(decimalFormat(Math.ceil(totalCost)).toLocaleString());
    $totalCount.html(totalCount.toLocaleString());
    $totalWeight.html(totalWeight.toLocaleString());
};


//Обновление данных о корзине в каталоге
const updateTotalInfo = (productId) => {
    const $form = $(`#cartForm-${productId}`);
    const weight = $form.find('input[name="weight"]').val();

    const $card        = $(`#cart-form-${productId}`);
    const $totalCount  = $card.find('.sizes-selection__total-count');
    const $totalWeight = $card.find('.sizes-selection__total-weight');
    const $input       = $card.find('input[name="selection-quantity-input"]');

    const selectedQuantity = Number($input.val());
    const totalWeight = selectedQuantity * Number(weight);

    $totalCount.html(selectedQuantity.toLocaleString());
    $totalWeight.html(totalWeight.toLocaleString());

    // const price = $form.find('input[name="price"]').val();
    // const $totalCost   = undefined;
    // $totalCost.html(decimalFormat(Math.ceil(totalCost)).toLocaleString());
};


export function addSelectionSizesEvents(productId, price, unit) {

    const get_stock = ($input) => {
        const inputBlock = $input.parents('div[name="input-block"]');
        const stockField = inputBlock.find('.sizes-selection__select-btn-foot');
        return Number(stockField.text());
    }

    const validateInput = ($input, productId, price, unit) => {
        const value = $input.val();
        $input.parent().toggleClass('error', !Number.isInteger(+value));
        const stock = get_stock($input);
        $input.parent().toggleClass('error', +value > +stock);
        updateTotalSizeInfo(productId, price, unit);
    };

    const prepareDataForCart = (curentCard, productId) => {
        return new Promise((resolve, reject) => {
            try {
                const result = {};
                const $form = $(`#sizes-selection-form-${productId}`)
                const $inputs = $form.find('input[name="sizes-selection-quantity-input"]');
                const selectedSizes = [];
                const removedSizes = [];
                $inputs.each(idx => {
                    const inputField = $inputs[idx];
                    const selectedQuantity = Number($(inputField).val());
                    const incartQuantity = Number($(inputField).attr('data-incart'));
                    if (selectedQuantity && selectedQuantity != incartQuantity) {
                        const selectedSize = {};
                        selectedSize['size'] = $(inputField).attr('data-size');
                        selectedSize['weight'] = parseFloat($(inputField).attr('data-weight').replace(",", "."));
                        selectedSize['quantity'] = selectedQuantity-incartQuantity;
                        selectedSize['unit'] = unit;
                        selectedSize['price'] = (selectedSize['weight'] * price).toFixed(2);
                        if (incartQuantity == 0) selectedSize['update'] = 'false';
                        else selectedSize['update'] = 'true';
                        selectedSizes.push(selectedSize);
                    }
                    if (!selectedQuantity && selectedQuantity != incartQuantity) {
                        const removedSize = {};
                        removedSize['size'] = $(inputField).attr('data-size');
                        removedSizes.push(removedSize);                
                    }
                });
                if (selectedSizes) {
                    const formData = new FormData();
                    formData.append('csrfmiddlewaretoken', $form.find('input[name="csrfmiddlewaretoken"]').val());
                    formData.append('sizes', JSON.stringify(selectedSizes));
                    result['selectedSizes'] = formData;
                }
                if (removedSizes) {
                    const formData = new FormData();
                    formData.append('csrfmiddlewaretoken', $form.find('input[name="csrfmiddlewaretoken"]').val());
                    formData.append('sizes', JSON.stringify(removedSizes));
                    result['removedSizes'] = formData;
                }
                return resolve(result);
            } catch {
                return reject('Ошибка подготовки данных в корзину!');
            }
        });
    }

    $('input[name="sizes-selection-quantity-input"]').on('change', (event) => {
        const $input = $(event.target);
        if ($input.val() > 999) $input.val(999);
        validateInput($input, productId, price, unit);
    });
    $('button[name="sizes-selection-quantity-increment"]').off('click').on('click', (event) => {
        const $input = $(event.target)
            .parents('.sizes-selection__quantity-input-wrapper')
            .find('input[name="sizes-selection-quantity-input"]');
        $input.val((_,val) => +val + 1 < 1000 ? +val+1 : 999);
        validateInput($input, productId, price, unit);
    });
    $('button[name="sizes-selection-quantity-decrement"]').off('click').on('click', (event) => {
        const $input = $(event.target)
            .parents('.sizes-selection__quantity-input-wrapper')
            .find('input[name="sizes-selection-quantity-input"]');
        $input.val((_,val) => +val - 1 > -1 ? +val-1 : 0);
        validateInput($input, productId, price, unit);
    });
    $('button[name="sizes-selection-add-to-cart-button"]').off('click').on('click', (event) => {
        prepareDataForCart(event.currentTarget, productId)
            .then((data) => {
                return new Promise((resolve, reject) => {
                    try {
                        const result = Promise.all([
                            sendSizesToCart(productId, data['selectedSizes']),
                            removeSizesFromCart(productId, data['removedSizes'])
                        ]);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            })
            .then((data) => {
                if (data) {
                    if($('.product-editing').length)
                        closeProductEditingWindow();
                    if($('.sizes-selection').length) {
                        closeAddToCartSettingsWindow();
                        const productsInCart = $(document).data("cart").getProducts();
                        productsInCart.then(cartData => {
                            const $form = $(event.target).parents(`#sizes-selection-form-${productId}`);
                            const $inputSizes = $form.find('input[name="sizes-selection-quantity-input"]');
                            $.each($inputSizes, (_, el) => {
                                $(el).attr('data-incart', 0);
                                const dataSize = $(el).attr('data-size');
                                for (var key in cartData) {
                                    if (cartData.hasOwnProperty(key)) {
                                        if (+cartData[key].size == dataSize) {
                                            $(el).attr('data-incart', cartData[key].quantity);
                                        }
                                    }    
                                }
                            });
                        });
                    }
                    $(document).data("cart").getProducts()
                }
            })
            .catch((error) => {
                handleError(error, 'Ошибка обновления каталога');
            });
    });
}


export function addSizeSlider(sizeForm, maxSizeBlocks) {

    const showSizes = (sizeBlocks, infoBlocks, visibleIndexes) => {
        $.each(sizeBlocks, (idx, el) => {
            const foundIdx = visibleIndexes.find(item => item == idx);
            if (foundIdx == undefined) {
                $(el).attr("style", "display: none !important;");
                const dataIndex = $(el).find('input[name="sizes-selection-quantity-input"]').attr('data-index');
                $.each(infoBlocks, (_, iEl) => {
                    const sizeId = $(iEl).find('button').attr('data-index');
                    if (dataIndex === sizeId) $(iEl).attr("style", "display: none !important;");
                });  
            } else {
                $(el).attr("style", "display: flex !important;");
                const dataIndex = $(el).find('input[name="sizes-selection-quantity-input"]').attr('data-index');
                $.each(infoBlocks, (_, iEl) => {
                    const sizeId = $(iEl).find('button').attr('data-index');
                    if (dataIndex === sizeId) $(iEl).attr("style", "display: flex !important;");
                });
            }
        });
    }

    const updateNavs = (form, minRange, maxRange, visibleIndexes) => {
        const backIcon = $(form).find('div[name="size-back"]');
        const nextIcon = $(form).find('div[name="size-next"]');
        backIcon.css('visibility', 'hidden');
        if (minRange < visibleIndexes[0]) backIcon.css('visibility', 'visible');
        nextIcon.css('visibility', 'hidden');
        if (maxRange > visibleIndexes[visibleIndexes.length-1]) nextIcon.css('visibility', 'visible');
    }

    let addSlider = false; const visibleSizes = [];
    const sizesSelectionSlider1 = sizeForm.find('.sizes-selection__slider-1');
    const sizesSelectionSlider2 = sizeForm.find('.sizes-selection__slider-2');
    const infoBlocks = sizesSelectionSlider1.find('div[name="info-block"]');
    const sizeBlocks = sizesSelectionSlider2.find('div[name="input-block"]');
    const backIcon = $(sizesSelectionSlider2).find('div[name="size-back"]');
    const nextIcon = $(sizesSelectionSlider2).find('div[name="size-next"]');

    for (var i=0; i<maxSizeBlocks; i++) {
        visibleSizes.push(i);
    }

    if (sizeBlocks.length > maxSizeBlocks) addSlider = true;
    if (addSlider) {
        showSizes(sizeBlocks, infoBlocks, visibleSizes);
        updateNavs(sizesSelectionSlider2, 0, sizeBlocks.length-1, visibleSizes);
    }

    backIcon.on('click', _ => {
        if (visibleSizes[0] > 0) {
            for (var i=0; i<visibleSizes.length; i++) {
                visibleSizes[i]--;   
            }
        }
        showSizes(sizeBlocks, infoBlocks, visibleSizes);
        updateNavs(sizesSelectionSlider2, 0, sizeBlocks.length-1, visibleSizes);
    });
    nextIcon.on('click', _ => {
        if (visibleSizes[visibleSizes.length-1] < sizeBlocks.length-1) {
            for (var i=0; i<visibleSizes.length; i++) {
                visibleSizes[i]++;   
            }
        }
        showSizes(sizeBlocks, infoBlocks, visibleSizes);
        updateNavs(sizesSelectionSlider2, 0, sizeBlocks.length-1, visibleSizes);
    });

}


const addToCart = (formId) => {

    const productForm = document.getElementById(formId);
    const formData    = new FormData(productForm);
    const productId   = formId.replace('cartForm-', '');

    sendProductToCart(productId, formData)
        .then((response) => {
            if (response['replay'] == 'error') throw new Error(response['message']);
            return waitUpdateCart(
                productForm.parentElement.parentElement,
                {'productId': response['pk'], 'size': response['size']},
                response
            );
        })
        .then(_ => {
            $(document).data("cart").getProducts()
            updateTotalInfo(productId);
        })
        .catch((error) => {
            handleError(error, 'Ошибка обновления корзины покупок');
        });
}


export const addOneToCart = (element) => {
    const cartElement = $(element).closest("[name='cart-row']").get(0).querySelector('input');

    cartElement.value = parseInt(cartElement.value) + 1;
    OnQuantityChange(cartElement, true);
}


export const delOneFromCart = (element) => {
    const cartElement = $(element).closest("[name='cart-row']").get(0).querySelector('input');
    if(Number(cartElement.value) > 0) {
        cartElement.value = parseInt(cartElement.value) - 1;
        OnQuantityChange(cartElement, true);
    }
}


const sendSizesToCart = async (productId, formData) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/add/sizes/${productId}/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: (response) => {
                resolve(response);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}


const sendProductToCart = (productId, formData) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/send/${productId}/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
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
 * Удаляет позиции товара из корзины.
 *
 * productId         - id товара в корзине.
 */
const removeSizesFromCart = async (productId, formData) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/remove/${productId}/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
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
 * Удаляет позицию товара из корзины.
 *
 * cartKey         - ключ позиции товара в корзине.
 */
const removeFromCart = (cartKey) => {
    let url = `/cart/remove/${cartKey.productId}`;
    if (cartKey.size)
        url = `${url}/${cartKey.size}`;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            success: (response) => {
                resolve(response);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}


const updateCartElements = (element, cartData, params) => {
    let is_sized = false;
    const productCard = $(element).parents('.product-item');
    if (productCard && productCard.attr('data-json')) {
        const productItemData = JSON.parse(productCard.attr('data-json'));
        is_sized = ('is_sized' in productItemData && productItemData.is_sized);
    }
    let cartButton     = element.querySelector('input[name="add-to-order"]');
    if (!cartButton)
        cartButton     = element.querySelector('input[name="add-to-cart"]');
    const cartElements = element.querySelector('div[name="cart-row"]');
    if (cartElements) {
        const cartElement    = cartElements.querySelector('input');
        const cartKeyElement = cartElements.querySelector('[name="cart-key"]');
        cartButton.parentElement.style = "display: block";
        cartElements.style             = "display: none";
        cartKeyElement.textContent     = JSON.stringify(params);
        cartElement.value              = cartData?.quantity || 0;
        if (!is_sized && cartData) {
            cartButton.parentElement.style = "display: none";
            cartElements.style             = "display: flex";
            cartElement.value              = cartData['quantity'];
        }
    }
}


/**
 * Действия при изменении индикатора количество изделий в корзине.
 *
 * element         - поле ввода количества в корзине.
 * preventReload   - удаляет текущую позицию в корзине если количество 0.
 */
export const OnQuantityChange = (element, preventReload=false) => {

    /**
     * Получает информацию о позиции корзины с бэка.
     *
     * params         - структура с productId и size для идентификации товара в корзине.
     */
    const getCartInfo = (params) => {
        const cart = $(document).data("cart");
        return cart.getProducts().then((products) => {
            return params.map((item) => {
                item.cartInfo = products[item.param.productId + '_' + item.param.size];
                return item
            })
        })
    }

    /**
     * Рекурсивно получает ключ позиции в корзине.
     *
     * element - поле ввода количества в корзине.
     * i       - порядковый номер интерации, не более 5
     */
    const getCartKey = (element, i) => {
        if (i >= 5) return ""; i++;
        const foundElement = element.querySelector('[name="cart-key"]');
        if (foundElement) {
            return JSON.parse(foundElement.textContent);
        }
        return getCartKey(element.parentElement, i);
    }

    const quantity = parseInt(element.value);
    if (quantity == 0) {
        const cartKey = getCartKey(element, 0);
        removeFromCart(cartKey)
            .then((response) => {
                if (response['replay'] == 'error') throw new Error(response['message']);
                if (!preventReload) {
                    const cartRows = document.querySelectorAll('[name="cart-row"]');
                    cartRows.forEach((cartRow) => {
                        if (cartRow.contains(element)) {
                            cartRow.outerHTML = '';
                        }
                    });
                }
                return waitUpdateCart(element.parentElement.parentElement, cartKey);
            })
            .then(_ => {
                $(document).data("cart").getProducts()
            })
            .catch((error) => {
                handleError(error, 'Ошибка удаления позиции из корзины покупок');
            });
    } else {
        const params = [];
        const cartRows = document.querySelectorAll('[name="cart-row"]');
        cartRows.forEach((cartRow) => {
            if (cartRow.contains(element)) {
                const cartKey = cartRow.querySelector('[name="cart-key"]');

                params.push({
                    'csrfToken': document.querySelector('[name="csrfmiddlewaretoken"]'),
                    'row'      : cartRow,
                    'param'    : JSON.parse(cartKey.textContent)
                });
            }
        });
        getCartInfo(params)
            .then((params) => {
                return new Promise((resolve, reject) => {
                    try {
                        const result = Promise.all(
                            params.map((item) => {
                                const quantity = item.cartInfo.quantity;
                                const formData = new FormData();
                                formData.append('csrfmiddlewaretoken', item.csrfToken.value);
                                formData.append('quantity', element.value - quantity);
                                formData.append('update'  , true);
                                formData.append('size'    , item.param.size);

                                return sendProductToCart(item.param.productId, formData);
                            })
                        );
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });

            })
            .then((response) => {
                response.forEach(item => {
                    $(document).data("cart").getProducts()
                    updateTotalInfo(item.pk);
                });
            })
            .catch((error) => {
                handleError(error, 'Ошибка обновления количества товара в корзине');
            });
    }
}


const handleAddToCart = (event) => {
    const elements = $(event.target).parents();
    for(var i=elements.length-1; i>=0; i--) {
        if ($(elements[i]).hasClass('product-item')) break;
        
    }
    let productItemData = {};
    try {
        productItemData = JSON.parse(elements[i].getAttribute('data-json'));
        const { unit } = productItemData;
        const { price } = productItemData;
        if ('is_sized' in productItemData && productItemData.is_sized) {
            $('.background-overlay').removeClass('hidden');
            const $modal = $(`#sizes-selection-form-${productItemData.id}`);
            const currentUrl = $modal.attr('data-url');
            if (currentUrl) {
                $.ajax({
                    url: currentUrl,
                    success: (data) => {
                        const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
                        let currentForm = reloadHtml.querySelector('div[name="form"]');
                        currentForm.id = generateUUID();
                        $modal.html(currentForm.innerHTML);
                        updateTotalSizeInfo(productItemData.id, price, unit);
                        addSelectionSizesEvents(productItemData.id, price, unit);
                        addSizeSlider($modal, 6);
                        $('.background-overlay').click(closeAddToCartSettingsWindow);
                    },
                    error: (xhr, status, error) => {
                        handleError(error, 'Ошибка открытия формы');
                    }
                });        
            }
            $(`#sizes-selection-form-${productItemData.id}`).removeClass('hidden');
            return;
        } else {                
            addToCart(`cartForm-${productItemData.id}`);
        }
    } catch (error) {
        handleError(error, 'Ошибка добавления в корзину');
    }
}


const handleAddOneToCart = (event) => {
    const $cartRowElement = $(event.target).closest("[name='cart-row']");
    const $cartKey = $("[name='cart-key']", $cartRowElement)
    if($cartRowElement.length && $("input", $cartRowElement).val() == 0){
        const $cartData = JSON.parse($cartKey.text())
        const formElement = $(`#cartForm-${$cartData.productId }`)
        $("input[name='size']", formElement).val($cartData.size)
        $("input[name='cart-quantity']", $cartRowElement).val(1);
        addToCart(`cartForm-${$cartData.productId }`);
    }else{
        addOneToCart(event.currentTarget);
    }
}


const handleDeleteOneFromCart = (event) => {
    delOneFromCart(event.currentTarget);
}


const handleAddToOrder = (event) => {
    const elements = $(event.target).parents();
    for(var i=elements.length-1; i>=0; i--) {
        if ($(elements[i]).hasClass('product-item')) break;
        
    }
    let productItemData = {};
    try {
        productItemData = JSON.parse(elements[i].getAttribute('data-json'));
        const { unit } = productItemData;
        const { price } = productItemData;
        if ('is_sized' in productItemData && productItemData.is_sized) {
            $('.background-overlay').removeClass('hidden');
            const $modal = $(`#sizes-selection-form-${productItemData.id}`);
            const currentUrl = $modal.attr('data-url');
            if (currentUrl) {
                $.ajax({
                    url: currentUrl,
                    success: (data) => {
                        const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
                        let currentForm = reloadHtml.querySelector('div[name="form"]');
                        currentForm.id = generateUUID();
                        $modal.html(currentForm.innerHTML);
                        updateTotalSizeInfo(productItemData.id, price, unit);
                        addSelectionSizesEvents(productItemData.id, price, unit);
                        addSizeSlider($modal, 6);
                        $('.background-overlay').click(closeAddToCartSettingsWindow);
                    },
                    error: (xhr, status, error) => {
                        handleError(error, 'Ошибка открытия формы');
                    }
                });        
            }
            $(`#sizes-selection-form-${productItemData.id}`).removeClass('hidden');
            return;
        } else {                
            addToCart(`cartForm-${productItemData.id}`);
        }
    } catch (error) {
        handleError(error, 'Ошибка добавления в заказ');
    }
}


// need to refactor and remove this promise
export function waitUpdateCart(element, params, product) {
    return new Promise((resolve) => {
        updateCartElements(element, product, params);
        if (params && 'productId' in params && params.productId)
            updateTotalInfo(params.productId);
            updateTotalSizeInfo(params.productId, 0, '163');
        resolve(product);
    });
};


var cart = undefined;
$(document).ready(() => {
    cart = new Cart();
})


// События номенклатуры связанные с корзиной
export function cartEvents(productsData) {
    const productsDataMap = {};
    if (productsData)
        for (const product of productsData.products) {
            const stockAndCosts = productsData.stockAndCosts
                .filter(data => data.fields.product[1] === product.pk);
            if (stockAndCosts.length) {
                productsDataMap[stockAndCosts[0].fields.product[1]] = {
                    product,
                    stockAndCosts
                }
            }
        }

    $('input[name="add-to-cart"]').on('click', (event) => {
        event.preventDefault();
        handleAddToCart(event);
    });

    $('.addOneToCart').on('click', (event) => {
        event.preventDefault();
        handleAddOneToCart(event);
    });

    $('.delOneFromCart').on('click', (event) => {
        event.preventDefault();
        handleDeleteOneFromCart(event);
    });

    $('input[name="add-to-order"]').on('click', (event) => {
        event.preventDefault();
        handleAddToOrder(event);
    });

}


// События корзины
export function cartViewEvents() {
    const cartViewElement = $('#cart-table');
    // Temp page fix
    if(cartViewElement.length) {
        $(document).on('cart.updated', function (e, data){
            let totalCount = 0;
            let totalWeight = 0;
            let totalSum = 0;

            $('[name=cart-row]', cartViewElement).each(function (index, item) {
                const cartKey = $('[name="cart-key"]', item)[0].textContent;
                const cartItemWeight = $('td.total_weight', item);
                const cartItemSum = $('td.total_price', item);
                if (!cartKey) return;
                const cartItemParams = JSON.parse(cartKey)
                const product = cart.products[cartItemParams.productId + '_' + cartItemParams.size];
                if (product) {
                    cartItemWeight.text(weightFormat((product.weight * product.quantity), 2));
                    cartItemSum.text(`${decimalFormat(Math.round(product.price * product.quantity))} р.`);
                    totalCount += product.quantity;
                    totalWeight += product.weight * product.quantity
                    totalSum += product.sum;
                }
            })
            $('.cart-result__total-count', cartViewElement).text(decimalFormat(totalCount) + " шт")
            $('.cart-result__total-weight', cartViewElement).text(weightFormat(totalWeight, 2) + " гр")
            $('.cart-result__total-price', cartViewElement).text(decimalFormat(Math.round(totalSum)) + " р")
        })
    }

    $(".remove-quantity", cartViewElement).on("click", function(e){
        e.preventDefault();
        const inputElement = $($(this).attr("href"));
        const inputElementValue = inputElement.val();
        if(inputElementValue > inputElement.attr("min")){
            inputElement.val(parseInt(inputElementValue) - 1).trigger('change')
        }
    })

    $(".add-quantity", cartViewElement).on("click", function(e){
        e.preventDefault();
        const inputElement = $($(this).attr("href"));
        const inputElementValue = inputElement.val();
        if(inputElementValue < inputElement.attr("max") || !inputElement.attr("max")){
            inputElement.val(parseInt(inputElementValue) + 1).trigger('change')
        }
    })

    const cartTableItems = $('#cart-items');
    if(cartTableItems.length) {
        cartTableItems.tablesorter({
            textExtraction: {
                '.articul' : function(node, table, cellIndex) {
                    return "#"  + $(node).text();
                },
                '.quantity' : function(node, table, cellIndex) {
                    return $(node).find("input").val();
                }
            }
        })
    }


    $('input[name="cart-quantity"]').on('change', (event) => {
        OnQuantityChange(event.currentTarget);
    });

    $(document).on("cart.quantity-change", function(e, data){
        cart.updateItem(data);
    });

    $('a[name="edit"]').on('click', (event) => {
        const item_params = $(event.currentTarget).parent().parent().parent().attr('data-json');
        const parsed_params = JSON.parse(item_params);

        const { unit } = parsed_params;
        const { price } = parsed_params;
        
        $('.background-overlay').removeClass('hidden');
        const $modal = $(`#product-editing-form-${parsed_params.id}`);
        const currentUrl = $modal.attr('data-url');
        if (currentUrl) {
            $.ajax({
                url: currentUrl,
                success: (data) => {
                    const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
                    let currentForm = reloadHtml.querySelector('main[name="main"]');
                    $modal.html(currentForm.outerHTML);
                    updateProductCard();
                    updateTotalSizeInfo(parsed_params.id, price, unit);
                    addSelectionSizesEvents(parsed_params.id, price, unit);
                    addSizeSlider($modal, 6);
                    $('.background-overlay').click(closeProductEditingWindow);
                },
                error: (xhr, status, error) => {
                    handleError(error, 'Ошибка открытия формы');
                }
            });        
        }
        $(`#product-editing-form-${parsed_params.id}`).removeClass('hidden');
        return;
    });

}



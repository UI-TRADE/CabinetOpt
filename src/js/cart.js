import 'tablesorter';
import Cart from "./components/cart";
import { sliderTemplateFn } from './catalog_card';
import { decimalFormat } from "./utils/money_format";

const showAddToCartSettingsWindow = (productsData) => {
    const $card = $('.add-to-cart-settings');
    const $addToCartBtn = $card.find('.add-to-cart-settings__add-to-cart-button');
    const $form = $(`#cartForm-${productsData.stockAndCosts[0].fields.product[1]}`);
    const $overlay = $('.background-overlay');
    const $sizesSlider = $card.find('.add-to-cart-settings__slider-1');
    const $availableCount = $card.find('.add-to-cart-settings__available-count');
    const $totalCost = $card.find('.add-to-cart-settings__sum');
    const $totalCount = $card.find('.add-to-cart-settings__total-count');
    const $totalWeight = $card.find('.add-to-cart-settings__total-weight');
    const $quantitiesSlider = $card.find('.add-to-cart-settings__slider-2');
    let availableCount = 0;
    $card.removeClass('hidden');
    $overlay.removeClass('hidden');
    const changedValues = {};
    const errorIndexes = {};
    const inputValues = {};
    const selectedIndexes = {};

    const closeAddToCartSettingsWindow = () => {
        $sizesSlider.slick('unslick');
        $sizesSlider.html('');
        $quantitiesSlider.slick('unslick');
        $quantitiesSlider.html('');
        $card.addClass('hidden');
        $overlay.addClass('hidden');
        $addToCartBtn.off();
        $overlay.off();
    };

    const sendCartData = () => {
        const keys = Object.keys(changedValues);
        if (Object.keys(errorIndexes).length || !keys.length) return;
        const promises = [];

        let i = 0;
        const sendNext = () => {
            if (i === keys.length) {
                $.when(...promises).done(() => {
                    closeAddToCartSettingsWindow();
                    return $(document).data("cart").getProducts();
                });
                return ;
            }
            const key = keys[i];
            const data = productsData.stockAndCosts[key];
            if (!changedValues[key].newValue) {
                if (!changedValues[key].prevValue) {
                    i += 1;
                    setTimeout(sendNext, 300);
                }
                promises.push(removeElementFromCart({
                    productId: productsData.stockAndCosts[key].fields.product[1],
                    size: productsData.stockAndCosts[key].fields.size[0]
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
                formData.append('unit', productsData.product.fields.unit);
                formData.append('size', data.fields.size[0]);
                formData.append('weight', data.fields.weight);
                promises.push(sendElementToCart(data.fields.product[1], formData));
            }
            i += 1;
            setTimeout(sendNext, 300);
        }

        sendNext();
    };

    const syncSlidersArrows = () => {
        const $nextSizesArrow = $sizesSlider.find('.add-to-cart-settings__slider-1-next');
        const $prevSizesArrow = $sizesSlider.find('.add-to-cart-settings__slider-1-prev');
        const $nextQuantitiesArrow = $quantitiesSlider.find('.add-to-cart-settings__slider-2-next');
        const $prevQuantitiesArrow = $quantitiesSlider.find('.add-to-cart-settings__slider-2-prev');
        $nextSizesArrow.click(() => $quantitiesSlider.slick('slickNext'));
        $prevSizesArrow.click(() => $quantitiesSlider.slick('slickPrev'));
        $nextQuantitiesArrow.click(() => $sizesSlider.slick('slickNext'));
        $prevQuantitiesArrow.click(() => $sizesSlider.slick('slickPrev'));
    };

    const updateTotalInfo = () => {
        const { stockAndCosts } = productsData;
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
        $input.parent().toggleClass('error', !Number.isInteger(+$input.val()));
        const { stock } = data.fields;
        if (selectedIndexes[index]) {
            $input.parent().toggleClass('error', +$input.val() > +stock);
        }
        if ($input.parent().hasClass('error')) {
            errorIndexes[index] = true;
        } else {
            delete errorIndexes[index];
            const newValue = selectedIndexes[index] ? +$input.val() : null;
            if (newValue !== +initialInputValue) {
                if (newValue || (+initialInputValue))
                    changedValues[index] = {
                        newValue,
                        prevValue: +initialInputValue || null
                    }
            } else {
                delete changedValues[index];
            }
        }
        inputValues[index] = $input.val();
        updateTotalInfo();
    };

    for (const key in productsData.stockAndCosts) {
        const data = productsData.stockAndCosts[key];
        const productDataBySize =
            cart.products[`${data.fields.product[1]}_${data.fields.size[0]}`];
        const wrapper = document.createElement('div');
        wrapper.classList.add('d-flex', 'flex-column', 'align-items-center');
        wrapper.innerHTML = `
            <button class="btn add-to-cart-settings__select-btn font-weight-bold ${productDataBySize ? 'selected' : ''}">
                ${data.fields.size[0]}
            </button>
            <div class="add-to-cart-settings__select-btn-foot">
                ${data.fields.weight}
            </div>
        `;
        $sizesSlider.append(wrapper);
        const $btn = $(wrapper).find('.btn');
        $btn.click(() => {
            if ($btn.hasClass('selected')) {
                $btn.removeClass('selected');
                delete selectedIndexes[key];
            } else {
                $btn.addClass('selected');
                selectedIndexes[key] = true;
            }
            validateInput($quantitiesSlider.find(`input[data-index="${key}"]`), data, productDataBySize?.quantity);
        });
        if (productDataBySize) {
            selectedIndexes[key] = true;
        }
        availableCount += productsData.stockAndCosts[key].fields.stock;
    }
    $sizesSlider.slick({
        draggable: false,
        infinite: false,
        nextArrow: `<button class="slick-prev add-to-cart-settings__slider-1-next" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        prevArrow: `<button class="slick-prev add-to-cart-settings__slider-1-prev" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        slidesToShow: 7,
        variableWidth: true,
    });
    for (const key in productsData.stockAndCosts) {
        const data = productsData.stockAndCosts[key];
        const wrapper = document.createElement('div');
        const productDataBySize =
            cart.products[`${data.fields.product[1]}_${data.fields.size[0]}`];
        wrapper.classList.add('d-flex', 'flex-column', 'align-items-center');
        wrapper.innerHTML = `
            <div class="add-to-cart-settings__quantity-input-wrapper">
                <input
                    class="form-control font-weight-bold add-to-cart-settings__quantity-input"
                    data-index="${key}"
                    min="0"
                    max="999"
                    type="number"
                    value="${productDataBySize?.quantity || 0}"
                >
                <button class="font-weight-bold add-to-cart-settings__quantity-input-spin-btn increment">
                    <span class="font-weight-bold add-to-cart-settings__quantity-input-spin-btn-text">+</span>
                </button>
                <button class="font-weight-bold add-to-cart-settings__quantity-input-spin-btn decrement">
                    <span class="font-weight-bold add-to-cart-settings__quantity-input-spin-btn-text">-</span>
                </button>
            </div>
            <div class="add-to-cart-settings__select-btn-foot">${data.fields.stock}</div>
        `;
        const $incrementButton = $(wrapper).find('.add-to-cart-settings__quantity-input-spin-btn.increment');
        const $decrementButton = $(wrapper).find('.add-to-cart-settings__quantity-input-spin-btn.decrement');
        const $input = $(wrapper).find('input');
        const initialInputValue = $input.val();
        $input.on('change', () => {
            if ($input.val() > 999) $input.val(999);
            validateInput($input, data, initialInputValue);
        });
        $incrementButton.click(() => {
            $input.val((_,val) => +val + 1 < 1000 ? +val+1 : 999);
            validateInput($input, data, initialInputValue);
        });
        $decrementButton.click(() => {
            $input.val((_,val) => +val - 1 > -1 ? +val-1 : 0);
            validateInput($input, data, initialInputValue);
        });
        $quantitiesSlider.append(wrapper);
        validateInput($input, data, initialInputValue);
    }
    $quantitiesSlider.slick({
        draggable: false,
        infinite: false,
        nextArrow: `<button class="slick-prev add-to-cart-settings__slider-2-next" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        prevArrow: `<button class="slick-prev add-to-cart-settings__slider-2-prev" type="button" style="background-image: url('/static/img/arrow.svg')"></button>`,
        slidesToScroll: 1,
        slidesToShow: 7,
        variableWidth: true,
    });
    syncSlidersArrows();
    $overlay.click(closeAddToCartSettingsWindow);
    $addToCartBtn.click(sendCartData);
    $availableCount.html(availableCount);
};

const addToCart = (formId) => {

    const productForm = document.getElementById(formId);
    const formData    = new FormData(productForm);
    const productId   = formId.replace('cartForm-', '');

    sendElementToCart(productId, formData)
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
        })
        .catch((error) => {
            alert('Ошибка обновления корзины покупок: ' + error);
        });
}


export const addOneToCart = (element) => {
    const cartElement = $(element).closest("[name='cart-row']").get(0).querySelector('input');

    cartElement.value = parseInt(cartElement.value) + 1;
    OnQuantityChange(cartElement, true);
}


export const delOneFromCart = (element) => {
    const cartElement = $(element).closest("[name='cart-row']").get(0).querySelector('input');
    if(cartElement.value != '0') {
        cartElement.value = parseInt(cartElement.value) - 1;
        OnQuantityChange(cartElement, true);
    }
}


const sendElementToCart = (productId, formData) => {
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
 * Удаляет позицию товара из корзины.
 *
 * cartKey         - ключ позиции товара в корзине.
 */
const removeElementFromCart = (cartKey) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/remove/${cartKey.productId}/${cartKey.size}/`,
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
    const cartButton     = element.querySelector('input[name="add-to-cart"]');
    const cartElements   = element.querySelector('div[name="cart-row"]');
    if (!cartElements) return;
    const cartElement    = cartElements.querySelector('input');
    const cartKeyElement = cartElements.querySelector('[name="cart-key"]');
    cartButton.parentElement.style = "display: block";
    cartElements.style             = "display: none";
    cartKeyElement.textContent     = JSON.stringify(params);
    cartElement.value              = 0;
    // TODO удалить старый функционал
    // if (cartData) {
    //     cartButton.parentElement.style = "display: none";
    //     cartElements.style             = "display: flex";
    //     cartElement.value              = cartData['quantity'];
    // }
}


/**
 * Действия при изменении индикатора количество изделий в корзине.
 *
 * element         - поле ввода количества в корзине.
 * preventReload   - удаляет текущую позицию в корзине если количество 0.
 */
const OnQuantityChange = (element, preventReload=false) => {

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
        removeElementFromCart(cartKey)
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
                alert('Ошибка удаления позиции из корзины покупок: ' + error);
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

                                return sendElementToCart(item.param.productId, formData);
                            })
                        );
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });

            })
            .then((response) => {
                let totalQuantity = 0;
                let totalWeight = 0;
                let totalPrice = 0;
                response.forEach(item => {
                    const currentParam = params.filter(el => el.param.productId == item.pk).find(_ => true);
                    const quantityField = currentParam.row.querySelector('input[name="cart-quantity"]');
                    const priceField    = currentParam.row.querySelector('[name="cart-price"]');
                    const sumField      = currentParam.row.querySelector('[name="cart-sum"]');

                    if (quantityField) {
                        quantityField.value = item.quantity;
                        totalQuantity += item.quantity
                    }
                    if (priceField)    sumField.textContent = decimalFormat(item.price) + " р.";
                    if (sumField){
                        sumField.textContent = decimalFormat(Math.ceil(item.sum)) + " р.";
                        totalPrice +=item.sum
                    }
                    totalWeight += item.weight;

                    $(document).data("cart").getProducts()
                });
            })
            .catch((error) => {
                alert('Ошибка обновления количества товара в корзине: ' + error);
            });
    }
}


// need to refactor and remove this promise
export function waitUpdateCart(element, params, product) {
    return new Promise((resolve) => {
        updateCartElements(element, product, params);
        resolve(product);
    });
};


export function cartEvents(productsData) {
    const productsDataMap = {};
    if (productsData)
        for (const product of productsData.products) {
            const stockAndCosts = productsData.stockAndCosts
                .filter(data => data.fields.product[0] === product.fields.name);
            productsDataMap[stockAndCosts[0].fields.product[1]] = {
                product,
                stockAndCosts
            };
        }

    $('input[name="add-to-cart"]').on('click', (event) => {
        showAddToCartSettingsWindow(productsDataMap[event.currentTarget.id.replace('cartForm-', '')]);
    });

    $('.addOneToCart').on('click', (event) => {
        event.preventDefault()
        const $cartRowElement = $(event.target).closest("[name='cart-row']");
        const $cartKey = $("[name='cart-key']", $cartRowElement)
        if($cartRowElement.length && $("input", $cartRowElement).val() == 0){
            const $cartData = JSON.parse($cartKey.text())
            const formElement = $(`#cartForm-${$cartData.productId }`)
            $("input[name='size']", formElement).val($cartData.size)
            $("input[name='quantity']", $cartRowElement).val(1);
            addToCart(`cartForm-${$cartData.productId }`);
        }else{
            addOneToCart(event.currentTarget);
        }
    });

    $('.delOneFromCart').on('click', (event) => {
        event.preventDefault()
        delOneFromCart(event.currentTarget);
    });
}
var cart = undefined;
$(document).ready(() => {
    cart = new Cart();
})


export function cartViewEvents() {
    const cartViewElement = $('#cart-table');
    // Temp page fix
    if(cartViewElement.length) {
        $(document).on('cart.updated', function (e, data){
            let totalCount = 0;
            let totalWeight = 0;
            let totalSum = 0;

            $('[name=cart-row]', cartViewElement).each(function (index, item){
                const rawData = JSON.parse($('[name="cart-key"]', item)[0].textContent)
                const product = cart.products[rawData.productId + '_' + rawData.size];
                $('td.total_weight', item).text(decimalFormat(product.weight * product.quantity))
                totalCount += product.quantity;
                totalWeight += product.weight * product.quantity
                totalSum += product.sum;
            })
            $('.cart-result__total-count', cartViewElement).text(decimalFormat(totalCount) + " шт")
            $('.cart-result__total-weight', cartViewElement).text(decimalFormat(totalWeight) + " гр")
            $('.cart-result__total-price', cartViewElement).text(decimalFormat(Math.ceil(totalSum)) + " р")
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
    })
}



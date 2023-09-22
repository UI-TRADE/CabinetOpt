import 'tablesorter';

const updateCartTitle = () => {
    $.ajax({
        url: location.href,
        success: (response) => {
            const reloadHtml = new DOMParser().parseFromString(response, 'text/html');
            document.querySelector('#cart-container').innerHTML = reloadHtml.querySelector('#cart-info').outerHTML;
        },
        error: (error) => {
            alert('Ошибка обновления заголовка корзины: ' + error);
        }
    });
}


const addToCart = (formId) => {

    const productForm = document.getElementById(formId);
    const formData    = new FormData(productForm);
    const productId   = formId.replace('cartForm-', '');

    sendElementToCart(productId, formData)
        .then((response) => {
            if (response['replay'] == 'error') throw new Error(response['message']);
            return waitUpdateCart(
                productForm.parentElement.parentElement,
                {'productId': response['pk'], 'size': response['size']}
            );
        })
        .then(_ => {
            updateCartTitle();
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
    if (cartData) {
        cartButton.parentElement.style = "display: none";
        cartElements.style             = "display: flex";
        cartElement.value              = cartData['quantity'];
    }
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

        return new Promise((resolve, reject) => {
            try {
                const result = Promise.all(
                    params.map((item) => {
                        let url = `/cart/info/${item.param['productId']}`;
                        if (item.param['size']) url += `/${item.param['size']}`;
                        return new Promise((resolve, reject) => {
                            $.ajax({
                                url: url,
                                success: (response) => {
                                    item.cartInfo = response;
                                    resolve(item);
                                }
                            });
                        });
                    })
                );
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
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
                updateCartTitle();
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
                response.forEach(item => {
                    const currentParam = params.filter(el => el.param.productId == item.pk).find(_ => true);
                    console.log(currentParam)
                    const quantityField = currentParam.row.querySelector('input[name="cart-quantity"]');
                    const priceField    = currentParam.row.querySelector('[name="cart-price"]');
                    const sumField      = currentParam.row.querySelector('[name="cart-sum"]');
                    if (quantityField) quantityField.value = item.quantity;
                    if (priceField)    sumField.textContent = item.price;
                    if (sumField)      sumField.textContent = item.sum;

                    updateCartTitle();
                });    
            })
            .catch((error) => {
                alert('Ошибка обновления количества товара в корзине: ' + error);
            });  
    }   
}


export function waitUpdateCart(element, params) {
    let url = `/cart/info/${params['productId']}`;
    if (params['size']) url += `/${params['size']}`;
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            success: (cartData) => {
                updateCartElements(element, cartData, params);
                resolve(cartData);
            },
            error: () => {
                reject();
            }
        });
    });
};


export function сartEvents() {

    $('input[name="add-to-cart"]').on('click', (event) => {
        addToCart(event.currentTarget.id);
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


export function cartViewEvents() {
    const cartViewElement = $('#cart-table');

    $(".remove-quantity", cartViewElement).on("click", function(e){
        e.preventDefault();
        const inputElement = $($(this).attr("href"));
        const inputElementValue = inputElement.val();
        if(inputElementValue > inputElement.attr("min")){
            console.log(inputElement, inputElementValue)
            inputElement.val(inputElementValue - 1).trigger('change')
        }
    })

    $(".add-quantity", cartViewElement).on("click", function(e){
        e.preventDefault();
        const inputElement = $($(this).attr("href"));
        const inputElementValue = inputElement.val();
        console.log(inputElementValue, inputElement.attr("max"))
        if(inputElementValue < inputElement.attr("max")){
            console.log(inputElementValue)
            inputElement.val(inputElementValue + 1).trigger('change')
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
            .on("sortEnd", function(e, table){
                console.log(e, table)
            })
    }


    $('input[name="cart-quantity"]').on('change', (event) => {
        OnQuantityChange(event.currentTarget);
    });
}



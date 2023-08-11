const switchCartView = (checked) => {
    document.getElementById('products').style.display = checked ? 'none' : 'block';
    document.getElementById('cart-table').style.display = checked ? 'block' : 'none';
    localStorage.setItem('cartView', checked);
}


function updateCartView(elementId) {
    const switchElement = document.getElementById(elementId);
    if (switchElement === null) {
        return;
    }
    if (localStorage.getItem('cartView') === 'true') {
        switchElement.click();
    }
    switchCartView(switchElement.checked)
    document.getElementById('cartViewArea').style.display = 'block';
}



const updateCartTitle = () => {
    const selector = 'i[name="cart_title"]'
    $.ajax({
        url: location.href,
        success: (response) => {
            const reloadHtml = new DOMParser().parseFromString(response, 'text/html');
            document.querySelector(selector).textContent = reloadHtml.querySelector(selector).textContent;
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


const addOneToCart = (element) => {
    const cartElement = element.parentElement.querySelector('input');
    cartElement.value = parseInt(cartElement.value) + 1;
    OnQuantityChange(cartElement, true);
}


const delOneFromCart = (element) => {
    const cartElement = element.parentElement.querySelector('input');
    cartElement.value = parseInt(cartElement.value) - 1;
    OnQuantityChange(cartElement, true);
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
    if (cartData) {
        cartButton.parentElement.style = "display: none";
        cartElements.style             = "display: flex";
        cartElement.value              = cartData['quantity'];
        cartKeyElement.textContent     = JSON.stringify(params);
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
                        return new Promise((resolve, reject) => {
                            $.ajax({
                                url: `/cart/info/${item.param['productId']}/${item.param['size']}`,
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
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/cart/info/${params['productId']}/${params['size']}`,
            success: (cartData) => {
                updateCartElements(element, cartData, params);
                resolve(true);
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
        addOneToCart(event.currentTarget);
    });

    $('.delOneFromCart').on('click', (event) => {
        delOneFromCart(event.currentTarget);
    });
}


export function cartViewEvents() {
    $('#cartView').click((event) => {
        switchCartView(event.currentTarget.checked);
    });
    $('input[name="cart-quantity"]').on('change', (event) => {
        OnQuantityChange(event.currentTarget);
    });
}


export default updateCartView;

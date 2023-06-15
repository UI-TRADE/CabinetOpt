const loadJson = function(selector) {
    return JSON.parse(document.querySelector(selector).getAttribute('data-json'));
}


const removeErrors = function() {
    Array.from(
        document.getElementsByClassName('errors')
    ).forEach((item) => {
        while (item.firstChild) {
            item.removeChild(item.firstChild);
        }
    });
}


const showErrors = function(errors) {
    removeErrors();
    $.each(JSON.parse(errors), (name, error) => {
        error.forEach((item) => {
            const newError = document.createElement('p');
            newError.textContent = item['message'];
            Array.from(
                document.getElementsByClassName(`${name}-error`)
            ).forEach((element) => {
                element.appendChild(newError);
            });
        });
    });
}


const showModalForm = function(formId) {
    $(`#${formId}`).on('shown.bs.modal', (event) => {
        $.ajax({
            url: event.relatedTarget.getAttribute('data-url'),
            success: (data) => {
                $(`#${formId}`).html(data);
            },
            error: (xhr, status, error) => {
                alert('Ошибка: ' + error);
            }
        });
    });
    updateModalForm(formId);   
}


const updateModalForm = function(formId) {
    $(`#${formId}`).on('submit', (event) => {
        event.preventDefault();
        $.ajax({
            type: 'POST',
            url: event.target.action,
            data: $(`.${formId}`).serialize(),
            success: (data) => {
                if(data['errors']) {
                    showErrors(data['errors']);
                    data['errors'] = {}
                } else {
                    $('.modal').modal('hide');
                    location.reload();
                }
            },
            error: (response) => {
                const errors = JSON.parse(response.responseText).errors;
                showErrors(errors);
            }
        });
    });
}


const updateForm = function(formId) {
    $.ajax({
        url: $(`#${formId}`).attr('action'),
        success: (data) => {
            $(`#${formId}`).html(data);
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}


const extractContent = function(html, elementId){
    const DOMModel = new DOMParser().parseFromString(html, 'text/html');
    return DOMModel.getElementById(elementId)?.innerHTML;
}


const updateElement = function(elementId, data) {
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (data) => {
            $(`#${elementId}`).html(
                extractContent(data, elementId)
            );
            document.getElementById(elementId).style.display = 'block';
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}


const toggleClassButton = function(target, fromClass, toClass) {
    const classes = target.classList;
    if ( classes.contains(fromClass) ) {
        classes.add(toClass);
        classes.remove(fromClass);
    } else if ( classes.contains(toClass) ) {
        classes.add(fromClass);
        classes.remove(toClass);
    }
}


const showElement = function(elementId, show) {
    document.getElementById(elementId).style.display = show ? 'block' : 'none';
}


const switchCartView = function(checked) {
    document.getElementById('products').style.display = checked ? 'none' : 'block';
    document.getElementById('cart-table').style.display = checked ? 'block' : 'none';
    localStorage.setItem('cartView', checked);
}

const updateCartView = function(elementId) {
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


const fillCollectionTree = (jsonCollection, collectionList, excludedCollection) => {

    Object.keys(jsonCollection).forEach((key) => {
        const node = jsonCollection[key];
        for (const nodeName in node) {
            if (node.hasOwnProperty(nodeName)) {
                innerHTML = 
                    `<li class="list-group-item"><span class="collection-box">${nodeName}</span>
                        <ul class="collection-nested list-group list-group-flush">`;

                node[nodeName].forEach((item) => {
                    const checked = (excludedCollection.includes(`collection-${item['id']}`)) ? "" : "checked"
                    innerHTML += 
                        `<li class="list-group-item" style="padding-top: 5px; padding-bottom: 5px; margin-left: 25px;">
                            <input class="form-check-input me-1 switch-change" type="checkbox" value="collection" id="collection-${item['id']}" ${checked}>
                            <label class="form-check-label" for="collection-${item['id']}" style="font-size: smaller;">${item['name']}</label></li>`;

                });
                innerHTML += `</ul></li>`;
                collectionList.innerHTML += innerHTML;
            }
          }
    });

}


const createBrandAndCollectionLists = function() {
    if (document.location.pathname !== "/catalog/products/") {
        return;
    }
    const excludedВrands = localStorage.getItem('excludedВrands');
    const excludedCollection = localStorage.getItem('excludedCollection');

    const brandList = document.querySelector('.brend-group'); 
    loadJson('#brands').forEach((brand) => {
        const checked = (excludedВrands.includes(`brand-${brand.pk}`)) ? "" : "checked"
        brandList.innerHTML += 
        `<li class="list-group-item">
            <input class="form-check-input me-1 switch-change" type="checkbox" value="brand" id="brand-${brand.pk}" ${checked}>
            <label class="form-check-label" for="brand-${brand.pk}">${brand.fields.name}</label>
        </li>`
    });

    const сollections = loadJson('#jsonCollections');
    const collectionGroup = document.querySelector('.collection-group'); 
    fillCollectionTree(сollections, collectionGroup, excludedCollection);

    updateElement('products', {
        'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        'data': JSON.stringify({
            'brand': excludedВrands.split(','),
            'collection': excludedCollection.split(',')
        })
    }); 
}


const updateItem = function(element) {
    const partsOfId = element.id.split('-');
    const quantityId = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-quantity`;
    const priceId    = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-price`;
    const sumId      = `${partsOfId.slice(0, partsOfId.length-1).join('-')}-sum`;    
    if (partsOfId[partsOfId.length-1] === 'quantity') {
        const price = document.getElementById(priceId);
        const sum = document.getElementById(sumId);
        sum.value = price.value * element.value;
    }
    else if (partsOfId[partsOfId.length-1] === 'price') {
        const quantity = document.getElementById(quantityId);
        const sum = document.getElementById(sumId);
        sum.value = quantity.value * element.value;
    }
    else if (partsOfId[partsOfId.length-1] === 'sum') {
        const quantity = document.getElementById(quantityId);
        const price = document.getElementById(priceId);
        price.value = element.value / (quantity.value != 0 ? quantity.value : 1);
    }
    else if (partsOfId[partsOfId.length-1] === 'price_type') {
    }
}

const updateProductWeight = function(size) {
    loadJson('#sizes').forEach((element) => {
        if (element.fields.size == size) {
            document.getElementById('product_weigth').textContent = `${element.fields.weight} грамм`;
        }
    });
}

const updateProductPrice = function(size) {
    const priceItem = loadJson('#price').find(Boolean)?.fields;
    let currentPrice = priceItem.price;
    const currentDiscount = priceItem.discount;
    loadJson('#sizes').forEach((element) => {
        if (element.fields.size == size) {
            const maxPrice = element.fields.cost;
            if (maxPrice > 0) {
                currentPrice = maxPrice;   
            }
            if (currentDiscount > 0) {
                currentPrice = currentPrice - (currentPrice * currentDiscount / 100)   
            }
        }
    });
    document.getElementById('product_price').textContent = `${currentPrice} руб.`;
}

const addEvents = function() {

    $('.order-row').click((event) => {
        window.document.location = event.currentTarget.dataset.href
    });

    $('#cartView').click((event) => {
        console.log('#cartView click');
        switchCartView(event.currentTarget.checked);
    });

    $('#Brend').on('click', (event) => {
        toggleClassButton(event.currentTarget, 'btn-success', 'btn-outline-success');
        toggleClassButton(
            document.getElementById('Assortment'), 'btn-outline-warning', 'btn-warning'
        );
        if ( event.currentTarget.classList.contains('btn-success') ) {
            showElement('brend-group', true);
            showElement('collection-group', false);
        } else {
            showElement('brend-group', false);
            showElement('collection-group', true);
        }
    })
    
    $('#Assortment').on('click', (event) => {
        toggleClassButton(event.currentTarget, 'btn-warning', 'btn-outline-warning');
        toggleClassButton(
            document.getElementById('Brend'), 'btn-outline-success', 'btn-success'
        );
        if ( event.currentTarget.classList.contains('btn-warning') ) {
            showElement('collection-group', true);
            showElement('brend-group', false);
        } else {
            showElement('collection-group', false);
            showElement('brend-group', true);
        }
    })
    
    $('.switch-change').on('change', (event) => {
        data = {'brand': [], 'collection': []};
        Array.from(
            document.getElementsByClassName('switch-change')
        ).forEach((item) => {
            if ( item.checked ) {
                return;
            }
            data[item.value].push(item.id);
        });
        localStorage.setItem('excludedВrands', data.brand);
        localStorage.setItem('excludedCollection', data.collection);
        
        updateElement('products', {
            'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
            'data': JSON.stringify(data)
        });
    })

    $('.product__size__block').on('click', (event) => {
        const toggler = document.getElementsByClassName('product__size__block'); var i;
        for (i=0; i < toggler.length; i++) {
            if (toggler[i].classList.contains('product__size__block--select')) {
                toggler[i].classList.remove('product__size__block--select');    
            }
        }
        event.target.classList.add('product__size__block--select');
        updateProductWeight(event.target.innerText);
        updateProductPrice(event.target.innerText);
    })

    const collectionBoxToggler = document.getElementsByClassName('collection-box'); var i;
    for (i = 0; i < collectionBoxToggler.length; i++) {
        collectionBoxToggler[i].addEventListener('click', (event) => {
        if (event.target.parentElement) {
            event.target.parentElement.querySelector('.collection-nested')?.classList.toggle('collection-active');
            event.target.classList.toggle('collection-open-box');
        }
      });
    }

}


$(window).on("load", function() {
    if (localStorage.getItem('cartView') === null) {
        localStorage.setItem('cartView', false);
    }
    if (localStorage.getItem('excludedВrands') === null) {
        localStorage.setItem('excludedВrands', new Array());
    }
    if (localStorage.getItem('excludedCollection') === null) {
        localStorage.setItem('excludedCollection', new Array());
    }
});


$(document).ready(() => {
    showModalForm('loginForm'); 
    showModalForm('regRequestForm');
    updateForm('contactForm');
    updateCartView('cartView');
    createBrandAndCollectionLists();
    addEvents();
})


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
    const DOMModel = new DOMParser()
        .parseFromString(html, 'text/html');
    return DOMModel.getElementById(elementId).innerHTML;
}


const updateElement = function(elementId, data) {
    $.ajax({
        type: 'POST',
        data: data,
        cache: false,
        success: (data) => {
            $(`#${elementId}`).html(
                extractContent(data, elementId)
        )},
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
    if (checked) {
        document.getElementById('products').style.display = 'none';
        document.getElementById('cart-table').style.display = 'block';
    } else {
        document.getElementById('products').style.display = 'block';
        document.getElementById('cart-table').style.display = 'none';
    }
    localStorage.setItem('cartView', checked);
}

const updateCartView = function(elementId) {
    if (localStorage.getItem('cartView') === 'true' && document.getElementById(elementId) !== null) {
        document.getElementById(elementId).click();
}}


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


$(document).ready(() => {
    showModalForm('loginForm'); 
    showModalForm('regRequestForm');
    updateForm('contactForm');
    updateCartView('cartView');
    $(".order-row").click((event) => {
        window.document.location = event.currentTarget.dataset.href
    });
})


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
    updateElement('products', {
        'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        'data': JSON.stringify(data)
    });
})

$('#cartView').on('change', (event) => {
    switchCartView(event.currentTarget.checked);
})

$('#table').on('click-row.bs.table', (row, $element, field) => {
    console.log(field);
    console.log(row);
})

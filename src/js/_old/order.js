import generateUUID from '../lib';
import autocomplete, {updateOrderItem} from '../components/autocomplete';


export function updateOrder() {

    const orderStocksAndCosts = (orderId) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/orders/stocks_and_costs',
                data: {'orderId': orderId},
                success: (response) => {
                    resolve(response);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const addSize = (element, value, text, selected=false, item=undefined) => {
        const newOption = document.createElement('option');
        newOption.value = value;
        newOption.selected = selected;
        newOption.textContent = text;
        if (item) newOption.setAttribute('data-json', JSON.stringify(item))
        element.appendChild(newOption);
    }

    const removeUnselectedOptions = (parentElement, selector) => {
        const field = parentElement.querySelector(selector);
        const fieldOptions = field.childNodes;
        for (var i=0; i<fieldOptions.length; i++) {
            if (fieldOptions[i].selected) break;
        }
        const dataOfSelectedOption = {
            'value': fieldOptions[i].value, 'text': fieldOptions[i].textContent
        };
        field.innerHTML = fieldOptions[i].outerHTML;
        return dataOfSelectedOption;
    }

    if (document.location.pathname.indexOf("/orders/order/") === -1 && document.location.pathname.indexOf("/orders/orders/") === -1 ) {
        return;
    }

    let orderId = window.location.pathname.split('/').reverse().find(x=>x!=='');
    const orderItemElement = $("#order-item");
    if(orderId === 'orders' && orderItemElement.length){
        orderId = orderItemElement.data("id")
    }else{
        return;
    }

    orderStocksAndCosts(orderId)
        .then((data) => {
            if (data['replay'] == 'error') throw new Error(data['message']);

            const order            = JSON.parse(data['order']);
            const products         = JSON.parse(data['products']);
            const stocks_and_costs = JSON.parse(data['stocks_and_costs']);
            const orderItems = document.getElementsByClassName('order-product-item');

            for (var i=0; i<orderItems.length; i++) {
                //очищаем элементы со списком выбора
                const nomenclatureElement         = orderItems[i].querySelector(`#id_items-${i}-nomenclature`);
                const nomenclatureSizeElement     = orderItems[i].querySelector(`#id_items-${i}-nomenclature_size`);
                nomenclatureElement.innerHTML     = '';
                nomenclatureSizeElement.innerHTML = '';

                //находим выбранную номенклатуру и заполяем ее на экране, остальное удаляем
                const selectedProduct = removeUnselectedOptions(orderItems[i], `#id_items-${i}-product`);
                if (selectedProduct) {
                    nomenclatureElement.value = selectedProduct.text;
                    nomenclatureElement.setAttribute('data-json', JSON.stringify(
                        products.find(el => el['pk'] == selectedProduct.value)
                    ));
                }

                //находим выбранный размер, и выводим все размеры на экран
                // const itemSizeValue = orderItems[i].querySelector(`#id_items-${i}-size`).value;
                const selectedSize    = removeUnselectedOptions(orderItems[i], `#id_items-${i}-size`);
                //добавляем пустой размер по умолчанию
                addSize(nomenclatureSizeElement,  '', '--', (!selectedSize.value));
                //добавляем доступные размеры
                const foundStocksAndCosts = stocks_and_costs.filter(
                    el => el['fields'].product == selectedProduct.value && el['fields'].size
                );
                foundStocksAndCosts.forEach((item) => {
                    const size = item['fields'].size.find(_ => true);
                    addSize(
                        nomenclatureSizeElement,
                        size,
                        size,
                        (selectedSize.text == size),
                        item
                    );
                })
            }

            const orderStatus = order.find(_=>true)['fields']['status'];
            if(orderStatus !== 'introductory') {
                $('input').attr('disabled', true);
                $('select').attr('disabled', true);
                $('#closeOrder').attr('disabled', false);
            }

        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });

}


export function additionalOrderEvents() {
    // Старый код, пока не убираю, ибо может понадобиться для редактирования заказа
    $('.order__toolbar__btn').on('click', (event) => {
        let elementName = event.target.getAttribute('name');
        if (!elementName) {
            elementName = event.target.parentElement.getAttribute('name');
        }

        if (elementName === 'add-item') {
            addOrderItem();
        } else if (elementName === 'delete-item') {
            deleteOrderItems();
        } else if (elementName === 'select-items') {
            selectOrderItems(true);
        } else if (elementName === 'unselect-items') {
            selectOrderItems(false);
        }

    });

    const nomenclatureElements = document.querySelectorAll('.order__field__nomenclature');
    for (var i = 0; i < nomenclatureElements.length; i++) {
        autocomplete(nomenclatureElements[i]);
    }

    const nomenclatureSizeElements = document.querySelectorAll('.order__field__nomenclature_size');
    for (var i = 0; i < nomenclatureSizeElements.length; i++) {
        nomenclatureSizeElements[i].addEventListener('change', (event) => {
            const orderItems = document.querySelectorAll('.order-product-item');
            for (var j=0; j<orderItems.length; j++) {
                if (orderItems[j].contains(event.target)) {
                    const sizeField = orderItems[j].querySelector(`select[name="items-${j}-size"]`);
                    updateOrderItem(sizeField);
                    break;
                }
            }
        });
    }

    $('.order__field__nomenclature_size').on('change', (event) => {
        updateOrderItem(event.currentTarget);
    });

    $('.order__field').on('change', (event) => {
        updateOrderItem(event.currentTarget);
    });
}


export const selectOrderItems = (checked) => {
    const checkFields = document.getElementsByName('order-product-item-selection');
    for (var i=0; i < checkFields.length; i++) {
        checkFields[i].checked = checked;
    }
}


export const addOrderItem = () => {

    const addNewOrderItem = (orderForm) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/orders/order/item/create',
                data: {order_id: orderForm.querySelector('input[name="items-__prefix__-order"]').value},
                success: (response) => {
                    orderForm.querySelector(
                        'input[name="items-__prefix__-id"]'
                    ).value = response['item_id'];
                    resolve(orderForm);
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    const extractElement = (html, elementSelector) => {
        const DOMModel = new DOMParser().parseFromString(html, 'text/html');
        return DOMModel.querySelector(elementSelector);
    }    

    const addColToTableRow = (row, element) => {
        const newCol = document.createElement('td');
        newCol.innerHTML = element;
        row.appendChild(newCol);
        return newCol;
    }

    if(window.document.location.pathname.indexOf("/orders/order/edit/") === -1){
        return;
    }

    const orderTableBody = document.getElementById('order-items').getElementsByTagName('tbody')[0];
    const __prefix__ = orderTableBody.getElementsByClassName('order-product-item').length;
    const orderItemForm = $('#empty-form').clone()[0];
    const newRow = document.createElement('tr');
    newRow.classList.add('order-product-item');

    addColToTableRow(
        newRow,
        `<td><input type="checkbox" id="${generateUUID()}" name="order-product-item-selection"></td>`
    );

    addNewOrderItem(orderItemForm)
        .then((data) => {
            data.querySelectorAll('*').forEach((node) => {
                if (node.name === 'items-__prefix__-order') {
                    orderTableBody.appendChild(extractElement(
                        node.outerHTML.replaceAll('__prefix__',  __prefix__),
                        'input[name="items-__prefix__-order"]'.replace('__prefix__',  __prefix__)
                    ));
                    return;
                }
                if (node.name === 'items-__prefix__-id') {
                    orderTableBody.appendChild(extractElement(
                        node.outerHTML.replaceAll('__prefix__',  __prefix__),
                        'input[name="items-__prefix__-id"]'.replace('__prefix__',  __prefix__)
                    ));
                    return;
                }                
                if(node.type !== 'hidden' && (node.nodeName === 'SELECT' | node.nodeName === 'INPUT')) {
                    if (node.name == "items-__prefix__-nomenclature_size") node.innerHTML = '<option value="0">--</option>';
                    const nodeId = node.id.replaceAll('__prefix__',  __prefix__);
                    const htmlElement = node.outerHTML.replaceAll('__prefix__',  __prefix__);
                    const newCol = addColToTableRow(newRow, `${htmlElement}<div class="formset-field"></div>`);
                    if (node.style.display == 'none') newCol.style.display = "none";
                    if (nodeId && newRow.querySelector(`#${nodeId}`)) newRow.querySelector(`#${nodeId}`).addEventListener(
                            'change',
                            (event) => {
                                updateOrderItem(event.currentTarget);
                        });
                    }
            });

            orderTableBody.appendChild(newRow);
            orderTableBody.querySelector('input[name="items-TOTAL_FORMS"]').value = __prefix__ + 1;
            orderTableBody.querySelector('input[name="items-INITIAL_FORMS"]').value = __prefix__ + 1;

            autocomplete(document.getElementById(`id_items-${__prefix__}-nomenclature`));
        })
        .catch((error) => {
            alert('Ошибка: ' + error);
        });

}


export const deleteOrderItem = (orderTableBody, removedElement) => {
    const randomFormElement = removedElement.querySelector('input[class="form-control"]');
    const match = randomFormElement.name.match(/items-(\d+)-\w+/);
    if (match) {
        const formId = parseInt(match[1], 10);
        orderTableBody.removeChild(removedElement);
        orderTableBody.removeChild(orderTableBody.querySelector(`input[name="items-${formId}-id"]`));
        orderTableBody.removeChild(orderTableBody.querySelector(`input[name="items-${formId}-order"]`));
    }

}


export const deleteOrderItems = () => {
    const orderTableBody = document.getElementById('order-items').getElementsByTagName('tbody')[0];
    const selectionFields = orderTableBody.querySelectorAll('input[name="order-product-item-selection"]');
    selectionFields.forEach((el) => {
        if(el.checked) {
            const deletedRow = el.parentElement.parentElement;
            const allFields = deletedRow.querySelectorAll('input');
            for (var i=0; i < allFields.length; i++) {
                if (allFields[i].name.indexOf('DELETE') !== -1) {
                    allFields[i].checked = true;
                }
            }
            deletedRow.style.display = 'none';
        }
    });
}


// $(`#checkDuplicates`).on('click', (event) => {
//     $('[id]').each(function(){
//         var id = $('[id="'+this.id+'"]');
//         if(id.length>1 && id[0]==this) {
//           console.log('Duplicate id '+this.id);
//           console.log(this);
//           alert('duplicate found');
//         }
//     });
// })


export default updateOrder;

import showSliders from './sliders';
import updateProducts from '../catalog_cards';


const loadJson = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return []
    return JSON.parse(document.querySelector(selector).getAttribute('data-json'));
}


const isTopNode = (element) => {
    let result = false
    $('.top-node').each((_, topNodeElement) => {
        if (jQuery.contains(topNodeElement, element)) result = true;
    });
    return result;
}

const openMenuItems = (element) => {
    $(element).toggleClass('item-close');
    const parent = $(element).closest('li');
    if (parent) {
        parent.find('ul').each((_, item) => {
            $(item).toggleClass('filter-item-disable');
        });
        parent.find('#sizes').each((_, item) => {
            $(item).toggleClass('filter-item-disable');
        });
        parent.find('div[name="slider"]').each((_, item) => {
            $(item).toggleClass('filter-item-disable');
        });
        parent.find('.gems').each((_, item) => {
            $(item).toggleClass('filter-item-disable');
        });
    }
}


const showCatalog = () => {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    const token = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (filters && token) {
        updateProducts('products', {
            'csrfmiddlewaretoken' : token.value,
            'filters': JSON.stringify(filters)
        });
    }
}


const selectMenuItem = (element) => {
    $(element).toggleClass('filter-item-title-active');
    const isActive = $(element).hasClass('filter-item-title-active');
    const dataJson = $(element).attr('data-json');
    if (dataJson) {
        const filters = JSON.parse(sessionStorage.getItem('filters'));
        const parsedData = JSON.parse(dataJson.replace(/'/g, '"'));
        let foundObjects = filters.filter(item => {
            if (Object.keys(item).length !== Object.keys(parsedData).length) return false;
            return Object.keys(parsedData).every(key => item[key] === parsedData[key])
        });
        if (!foundObjects.length && isActive) {
            filters.push(parsedData);
        }
        if (foundObjects.length && !isActive) {
            foundObjects.forEach(el => {
                filters.splice(filters.indexOf(el), 1);   
            });
        }
        sessionStorage.setItem('filters', JSON.stringify(filters));
    }
}


const updateMenuItems = () => {
    let dataJson;
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    $('.filter-item-title').each((_, element) => {
        dataJson = $(element).attr('data-json');
        if (dataJson) {
            const parsedData = JSON.parse(dataJson.replace(/'/g, '"'));
            let foundObjects = filters.filter(item => {
                if (Object.keys(item).length !== Object.keys(parsedData).length) return false;
                return Object.keys(parsedData).every(key => item[key] === parsedData[key])
            });
            if (foundObjects.length) {
                $(element).toggleClass('filter-item-title-active');
            }    
        }
    });
    $('.form-check-input').each((_, element) => {
        let foundObject = filters.filter(item => item[element.name]).find(_ => true);
        if (foundObject) element.checked = foundObject[element.name];   
    });
}


const setDefaultInStockFilter = () => {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    if (!filters.filter(item => item['in_stock']).find(_ => true)) {
        $('#inStockFilter').prop('checked', true);
        filters.push({'in_stock': true});
        sessionStorage.setItem('filters', JSON.stringify(filters));
    }
}


export function filtersEvents() {
    
    $(document).on('click', '.filter-item-title', event => {
        if (isTopNode(event.target)) {
            const imgOfNode = $(event.target.closest('.top-node')).find('img');
            if (imgOfNode) openMenuItems(imgOfNode);
        } else {
            selectMenuItem(event.target);
            showCatalog();
        }
    });

    $(document).on('click', '.filter-item img', event => {
        openMenuItems(event.target);
    });

    $(document).on('click', '.reset', event => {
        const parent = $(event.target).closest('li');
        if (parent.length) {
            $(parent).find('.filter-item-title-active').each((_, element) => {
                selectMenuItem(element);
                
            });
        } else {
            sessionStorage.setItem('filters', JSON.stringify([]));
            $('.filter-item-title-active').each((_, element) => {
                $(element).removeClass('filter-item-title-active');  
            });
            $('.form-check-input').each((_, element) => {
                element.checked = false;   
            });
            setDefaultInStockFilter();
        }
        showCatalog();
    });

    $(document).on('click', '.form-check-input', event => {
        const filters = JSON.parse(sessionStorage.getItem('filters'));
        for (var nameOfCeckedFilter of ['in_stock', 'available_for_order']) {
            let foundFilter = false;
            (filters ||[]).forEach(item => {
                if (Object.keys(item).find(k => k == nameOfCeckedFilter)) {
                    foundFilter = true;
                    item[nameOfCeckedFilter] = event.target.checked;
                }
            });
            if (!foundFilter) {
                let obj = {};
                obj[`${nameOfCeckedFilter}`] = event.target.checked;
                filters.push(obj);
            }
        }
        sessionStorage.setItem('filters', JSON.stringify(filters));
        showCatalog();
    });
}


function initProductFilters() {

    if (document.location.pathname !== "/catalog/products/") {
        return;
    }
    
    setDefaultInStockFilter();
    $.ajax({
        url: '/catalog/filters',
        success: (data) => {
            $('#filter-container').html(data);
            showSliders();
            updateMenuItems();
            showCatalog();
        },
        error: (error) => {
            alert('Ошибка получения данных фильтров с сервера: ' + error);
        }
    });

}

export default initProductFilters;

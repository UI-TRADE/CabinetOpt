import showSliders from './sliders';
import updateProducts from '../catalog_cards';
import { handleError } from "../utils/exceptions";
import { createSpiner } from '../lib';

var selectedFiltersBadges;

class FilterBadges {
    constructor(element, filterContainer) {
        this.element = element;
        this.filterContainer = filterContainer;

        this.filterTemplates = {
            'default': (value) => `${value}`,
            "size__name": (value) => `${value}`,
            "weight_min": (value) => `от ${value} г`,
            "weight_max": (value) => `до ${value} г`,
            "price_min": (value) => `от ${value} руб`,
            "price_max": (value) => `до ${value} руб`,
            "gem_quantity_min": (value) => `от ${value} шт.`,
            "gem_quantity_max": (value) => `от ${value} шт.`
        }

        this.ignore_filters = ['in_stock', 'weight_min', 'weight_max', 'price_min', 'price_max', 'gem_quantity_min', 'gem_quantity_max']
    }

    update(filters){

        this.filters = filters;

        this.filtersElements = this.filters
            .filter(value => this.ignore_filters.indexOf(Object.keys(value)[0]) === -1)
            .filter((value =>
                Object.values(value)
                .filter(value =>  value !== null && typeof value !== "boolean").length)) // hide boolean(in_stock) or null values
            .filter(value => value['search_values'] == undefined)
            .map(filter =>
                $("<span />")
                    .addClass('badge badge-secondary')
                    .text(
                        (this.filterTemplates[Object.keys(filter)[0]] || this.filterTemplates['default'])(
                            Object.values(filter).filter(value => !!value)[0]
                        )
                    )
                    .append(
                        $("<i />")
                            .addClass("fa fa-close")
                            .attr("aria-hidden", "true")
                            .on("click", this.removeFilter(filter))
                    )
            )
        this.element.empty().append(this.filtersElements)
    }

    removeFilter(filter){
        return (e) => {
            e.preventDefault();
            const foundFilters = $(".filter-item-title-active", this.filterContainer).filter((index, element) => {
                const filterInfo = $(element).data("json");
                if (Array.isArray(filterInfo)) {
                    for(var i=0;i<filterInfo.length;i++) {
                        if (filterInfo[i]['ident'] === filter['ident']) return true;
                    }
                } else {
                    return $(element).data("json")['ident'] === filter['ident'];
                }
            });
            $(foundFilters[0]).trigger("click");
        }
    }
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


const openSelectedItems = (element) => {
    try {
        const patentElement = $(element).parents('li[name="bundle"]').first();
        patentElement.find('img[class="item-close"]').toggleClass('item-close');
        const disableItems = patentElement.find('.filter-item-disable');
        disableItems.each((_, element) => {
            $(element).removeClass('filter-item-disable');    
        }); 
    } catch {;}
}


const showCatalog = () => {
    const currentSpin = createSpiner($('.main-content')[0]);
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    const token = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (filters && token) {
        const url = new URL(window.location.href);
        const pageValue = url.searchParams.get('page');

        if (!pageValue) {
            updateProducts('products', {
                'csrfmiddlewaretoken' : token.value,
                'filters': JSON.stringify(filters)
            }, currentSpin);
            return;    
        }

        $.ajax({
            url: 'pages/count/',
            type: 'POST',
            data: {'filters': JSON.stringify(filters)},
            success: (data) => {
                if (data['pages_count'] < parseInt(pageValue)) {
                    url.searchParams.set('page', data['pages_count']);
                    window.location.replace(url.toString());
                    return;
                }

                updateProducts('products', {
                    'csrfmiddlewaretoken' : token.value,
                    'filters': JSON.stringify(filters)
                }, currentSpin);
                
            },
            error: (error) => {
                handleError(error, 'Ошибка получения объема выборки с сервера');
            }
        });
    }
}


// const canRemoveFilterItem = (currnetIdent) => {
//     const selectedSizes = $('.size-item.filter-item-title-active');
//     for(var i=0; i<selectedSizes.length; i++) {
//         if ($(selectedSizes[i]).data('json').find(f => f['ident'] === currnetIdent)) {
//             return false;
//         }    
//     }
//     return true;
// }


const selectMenuItem = (element, filters) => {
    $(element).toggleClass('filter-item-title-active');
    const isActive = $(element).hasClass('filter-item-title-active');
    let dataJson = $(element).data('json');
    if (!Array.isArray(dataJson)) dataJson = [].concat(dataJson);
    if (isActive && dataJson) {
        dataJson.forEach(f => {
            let foundObjects = filters.filter(item => item['ident'] === f['ident']);
            if (!foundObjects.length) {
                filters.push(f);
                const currentElement = $(`.filter-item-title[name=${f['ident']}]`);
                $.each(currentElement, (_, el) => $(el).addClass('filter-item-title-active'));   
            }   
        });
    }
    if (!isActive && dataJson) {
        if ($(element).hasClass('size-item')) {
            dataJson.forEach(f => {
                if (f['name'] === 'size__name') {
                    let foundObjects = filters.filter(item => item['ident'] === f['ident']);
                    let foundObject = foundObjects[foundObjects.length-1];
                    filters.splice(filters.indexOf(foundObject), 1);
                    // if (canRemoveFilterItem(foundObject['ident']))
                    //     filters.splice(filters.indexOf(foundObject), 1);
                }
            });
        } else {
            let foundObjects = filters.filter(item => item['ident'] === $(element).attr('name'));
            foundObjects.forEach(el => {
                filters.splice(filters.indexOf(el), 1);
            });
            if (dataJson.length === 1) {
                const parent_items = $(element).parents('li');
                const parent_item = parent_items[parent_items.length - 1];
                const activeMenuItems = $(parent_item).find('.filter-item-title-active');
                $.each(activeMenuItems, (_, activeMenuItem) => selectMenuItem(activeMenuItem, filters));
            }
        }
    }
    sessionStorage.setItem('filters', JSON.stringify(filters));
    selectedFiltersBadges.update(filters);
}


const deselectMenuItems = () => {
    $('.filter-item-title-active').each((_, element) => {
        $(element).removeClass('filter-item-title-active');
    });
    $('#inStockFilter').each((_, element) => {
        element.checked = false;
    });
}


const updateMenuItems = () => {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    $('.filter-item-title').each((_, element) => {
        let currentFilter = [];
        const elementName = $(element).attr('name');
        if (elementName)
            currentFilter = filters.filter(item => item['ident'] === elementName);
        if (currentFilter.length) {
            $(element).toggleClass('filter-item-title-active');
            openSelectedItems(element);
        }
    });
    $('#inStockFilter').each((_, element) => {
        const inStockItem = filters.find(item => 'in_stock' in item);
        if (inStockItem)
            element.checked = !inStockItem['in_stock'];
        else {
            //set default value in_stock
            element.checked = false;
            filters.push({'in_stock': !element.checked});
            sessionStorage.setItem('filters', JSON.stringify(filters));
        }
    });
    $('.product-find').each((_, element) => {
        const searchFilter = filters.find(item => item['search_values'] != undefined);
        if (searchFilter) {
            $(element).val(searchFilter['search_values']);
        }
    });

    selectedFiltersBadges.update(filters);
}


// const updateSearchValues = () => {
//     const searchValues = JSON.parse(sessionStorage.getItem('search_values'));
//     $('.').val(searchValues);

// }

// Получаем массив соответствий элементов фильтра и количества и сумм
export function  updateFilterQuantitiesAndSums(html) {
    try {
        $('span.count').each((_, element) => {
            $(element).text('');
        });
        const DOMModel = new DOMParser().parseFromString(html, 'text/html');
        const filters = JSON.parse(DOMModel.getElementById('filters')?.getAttribute('data-json'));
        for (var key in filters) {
            if (filters.hasOwnProperty(key)) {
                filters[key].forEach(item => {
                    $(`[name='${item.ident}']`).each((_, element) => {
                        const countElement = $(element).children('span.count');
                        if (countElement && key !== 'sizes')
                            countElement.text(`(${item['count']})`);
                        if (item['count'])
                            $(element).closest('li[class="filter-item-title-hidden"]').removeClass('filter-item-title-hidden');
                        if ($(element).hasClass('size-item'))
                            $(element).removeClass('filter-item-title-hidden');
                    });
                });
            }
        }
    }
    catch (error) {
        handleError(error);
    }

}


export function filtersEvents() {

    $(document).on('click', '.filter-item-title', event => {
        if (isTopNode(event.currentTarget)) {
            const imgOfNode = $(event.currentTarget.closest('.top-node')).find('img');
            if (imgOfNode) openMenuItems(imgOfNode);
        } else {
            if ($(event.currentTarget).is('.filter-item-title-disable')) return;
            const filters = JSON.parse(sessionStorage.getItem('filters'));
            selectMenuItem(event.currentTarget, filters);
            showCatalog();
        }
    });

    $(document).on('click', '.f-open', event => {
        openMenuItems(event.target);
    });

    $(document).on('click', '.reset', event => {
        const parent = $(event.target).closest('li');
        if (parent.length) {
            $(parent).find('.filter-item-title-active').each((_, element) => {
                const filters = JSON.parse(sessionStorage.getItem('filters'));
                selectMenuItem(element, filters);
            });
        } else {
            sessionStorage.setItem('filters', JSON.stringify([{'in_stock': true}]));
            deselectMenuItems();
            selectedFiltersBadges.update([]);
        }
        showCatalog();
    });

    $(document).on('click', '#inStockFilter', event => {
        const filters = JSON.parse(sessionStorage.getItem('filters'));
        for (var nameOfCeckedFilter of ['in_stock',]) {
            let foundFilter = false;
            (filters ||[]).forEach(item => {
                if (Object.keys(item).find(k => k == nameOfCeckedFilter)) {
                    foundFilter = true;
                    // if the in_stock filter is unchecked, only products in stock are displayed, otherwise - all
                    item[nameOfCeckedFilter] = !event.target.checked;
                }
            });
            if (!foundFilter) {
                let obj = {};
                // if the in_stock filter is unchecked, only products in stock are displayed, otherwise - all
                obj[`${nameOfCeckedFilter}`] = !event.target.checked;
                filters.push(obj);
            }
        }
        sessionStorage.setItem('filters', JSON.stringify(filters));
        location.reload();
        // showCatalog();
    });

    $(document).on("submit", (event) => {
        const currentTarget = event.target
        if (currentTarget.id == 'form-product-find') {
            event.preventDefault();
            let searchValues = [];
            const inputFindField = $(currentTarget).children('input');
            const searchString = inputFindField.val();

            if (searchString)
                searchValues = searchString.split(';');
            const filters = JSON.parse(sessionStorage.getItem('filters'));
            const searchFilter = filters.find(item => item['search_values'] != undefined);
            
            if (searchFilter)
                filters.splice(filters.indexOf(searchFilter), 1);
            if (searchValues.length)
                filters.push({'search_values': searchValues});
            
            sessionStorage.setItem('filters', JSON.stringify(filters));
            showCatalog();
        }
    });

    $(document).on('click', '#in-catalog', event => {
        event.preventDefault();
        const inputFindField = $('#form-product-find').children('input');
        if (inputFindField) {
            inputFindField.val('');
            const filters = JSON.parse(sessionStorage.getItem('filters'));
            const searchFilter = filters.find(item => item['search_values'] != undefined);
            if (searchFilter) filters.splice(filters.indexOf(searchFilter), 1);
            sessionStorage.setItem('filters', JSON.stringify(filters));
            showCatalog();
        }
    });
    
}


function initProductFilters() {
    const { pathname } = document.location;

    if (pathname !== "/catalog/products/" && !RegExp('^\/catalog\/product\/[0-9]*\/$').test(pathname)) {
        return;
    }

    $.ajax({
        url: '/catalog/filters',
        success: (data) => {
            const filterContainer = $('#filter-container').html(data);
            selectedFiltersBadges = new FilterBadges($("#selected-filter-container"), filterContainer)
            showSliders();
            updateMenuItems();
            showCatalog();
        },
        error: (error) => {
            handleError(error, 'Ошибка получения данных фильтров с сервера');
        }
    });

}

export default initProductFilters;

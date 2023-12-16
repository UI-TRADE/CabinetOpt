import showSliders from './sliders';
import updateProducts from '../catalog_cards';

var selectedFiltersBadges;
class FilterBadges {
    constructor(element, filterContainer) {
        this.element = element;
        this.filterContainer = filterContainer;

        this.filterTemplates = {
            'default': (value) => `${value}`,
            "size__name": (value) => `${value}`,
            "weight_min": (value) => `от ${value} гр.`,
            "weight_max": (value) => `до ${value} гр.`,
            "price_min": (value) => `от ${value} р.`,
            "price_max": (value) => `до ${value} р.`,
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
            $(".filter-item-title-active", this.filterContainer).filter((index, element) =>
                JSON.stringify($(element).data("json")) === JSON.stringify(filter)
            ).trigger("click")
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
        let selectedFilters;
        const filters = JSON.parse(sessionStorage.getItem('filters'));
        const parsedData = JSON.parse(dataJson.replace(/'/g, '"'));
        if (Array.isArray(parsedData))
            selectedFilters = parsedData;
        else
            selectedFilters = [].concat(parsedData);
        selectedFilters.forEach(f => {
            let foundObjects = filters.filter(item => item['ident'] === f['ident']);
            if (!foundObjects.length && isActive) {
                filters.push(f);
                const currentElement = $(`.filter-item-title[name=${f['ident']}]`);
                $.each(currentElement, (_, el) => $(el).addClass('filter-item-title-active'));
            }
            if (foundObjects.length && !isActive) {
                foundObjects.forEach(el => {
                    filters.splice(filters.indexOf(el), 1);
                });
            }
        });
        sessionStorage.setItem('filters', JSON.stringify(filters));
        selectedFiltersBadges.update(filters);
    }
}


const updateMenuItems = () => {
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    $('.filter-item-title').each((_, element) => {
        let currentFilter = [];
        const elementName = $(element).attr('name');
        if (elementName)
            currentFilter = filters.filter(item => item['ident'] === elementName);
        if (currentFilter.length)
            $(element).toggleClass('filter-item-title-active');
    });
    $('.form-check-input').each((_, element) => {
        let foundObject = filters.filter(item => item[element.name]).find(_ => true);
        if (foundObject) {
            if (element.name == "in_stock") 
                element.checked = !foundObject[element.name];
            else 
                element.checked = foundObject[element.name];
        }
    });

    selectedFiltersBadges.update(filters);
}


const updateFilterElements = (elements) => {
    $('.filter-item-title').each((_, item) => {
        const foundElement = elements.find(el => el['element'] == item);
        if (foundElement) {
            const countElement = $(foundElement['element']).children('span.count');
            if (countElement) countElement.text(`(${foundElement['count']})`);
            $(foundElement['element']).removeClass('filter-item-title-disable');
            if (foundElement.hasOwnProperty('sum') && foundElement['sum'] > 0) {
                $(foundElement['element']).addClass('size-active');
            }   
            return;
        }
        if (!$(item).hasClass('filter-item-title-disable')) {
            const countElement = $(item).children('span.count');
            if (countElement) countElement.text('(0)');
            if ($(item).is('.filter-point')) {
                $(item).addClass('filter-item-title-disable');
                $(item).removeClass('size-active');
            }
        }
    });
}


export function  updateFilters(html) {
    try {
        const DOMModel = new DOMParser().parseFromString(html, 'text/html');
        const filters = JSON.parse(DOMModel.getElementById('filters')?.getAttribute('data-json'))
        const activeFilters = new Array;
        for (var key in filters) {
            if (filters.hasOwnProperty(key)) {
                filters[key].forEach(item => {
                    const elements = $(`[name='${item.ident}']`);
                    elements.each((_, element) => {
                        const activeFilter = {'element': element, 'count': item['count']};
                        if (item.hasOwnProperty('sum')) Object.assign(activeFilter, {'sum': item['sum']});
                        activeFilters.push(activeFilter);
                    });
                });
            }
        }
        updateFilterElements(activeFilters);
    }
    catch (error) {
        console.warn(error);
    }

}


export function filtersEvents() {

    $(document).on('click', '.filter-item-title', event => {
        if (isTopNode(event.target)) {
            const imgOfNode = $(event.target.closest('.top-node')).find('img');
            if (imgOfNode) openMenuItems(imgOfNode);
        } else {
            if ($(event.target).is('.filter-item-title-disable')) return;
            selectMenuItem(event.target);
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
                selectMenuItem(element);
            });
        } else {
            sessionStorage.setItem('filters', JSON.stringify([{'in_stock': true}]));
            $('.filter-item-title-active').each((_, element) => {
                $(element).removeClass('filter-item-title-active');
            });
            $('.form-check-input').each((_, element) => {
                element.checked = false;
            });
            selectedFiltersBadges.update([]);
        }
        showCatalog();
    });

    $(document).on('click', '.form-check-input', event => {
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
        showCatalog();
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
            alert('Ошибка получения данных фильтров с сервера: ' + error);
        }
    });

}

export default initProductFilters;

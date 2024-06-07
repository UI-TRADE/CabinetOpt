import updateProducts from '../catalog_cards';
import { createSpiner } from '../lib';

const showCatalog = () => {
    const currentSpin = createSpiner($('.main-content')[0]);
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    const token = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (filters && token) {
        updateProducts('products', {
            'csrfmiddlewaretoken' : token.value,
            'filters': JSON.stringify(filters),
            'sorting': JSON.stringify({}),
        }, currentSpin);
    }
}

const getSliderAttr = (sliderId) => {
    let attributeName = '';
    if (sliderId == 'weight-range') {
        attributeName = 'weight';
    } else if (sliderId == 'price-range') {
        attributeName = 'price';
    } else if (sliderId == 'quantity-range') {
        attributeName = 'gem_quantity';
    } else if (sliderId == 'instok-range') {
        attributeName = 'stock';
    }
    return attributeName;
}


const getDefaultValues = (sliderId, min, max) => {
    const attributeName = getSliderAttr(sliderId);
    const filters = JSON.parse(sessionStorage.getItem('filters'));
    if (filters) {
        (filters || []).forEach(item => {
            if (Object.keys(item).find(k => k == `${attributeName}_min`)) {
                min = item[`${attributeName}_min`];
            }
            if (Object.keys(item).find(k => k == `${attributeName}_max`)) {
                max = item[`${attributeName}_max`];
            }
        });
    }
    return [ min, max ];
}


const updateFilters = (filters, key, value) => {
    let addKey = true;
    (filters || []).forEach(item => {
        if (Object.keys(item).find(k => k == key)) {
            item[key] = parseFloat(value);
            addKey = false;
        }
    });
    if (addKey) {
        const obj = {};
        obj[key] = parseFloat(value);
        filters.push(obj);
    }
}


const renderSlider = (sliderId, min, max, step, default_min, default_max) => {
    $( `#${sliderId}` ).slider({
        range: true,
        min: min,
        max: max,
        step: step,
        values: getDefaultValues(sliderId, default_min, default_max),
        create: function(event, ui) {
            const currentValues = $(this).slider('values');
            const currentWidget = $(this).slider('widget');
            const handler = currentWidget.find('.ui-slider-range')[0];

            const startValue = $( `#${sliderId} span[name='start-value']` );
            startValue.css('left', handler.offsetLeft-3);
            startValue.text(currentValues[0]);

            const endValue = $( `#${sliderId} span[name='end-value']` );
            endValue.css('left', handler.offsetLeft + handler.offsetWidth);
            endValue.text(currentValues[1]);

        },
        slide: function( event, ui ) {
            if (ui.handleIndex == 0) {
                const handler = $( `#${sliderId} span[name='start-value']` );
                const position = $(ui.handle).css('left');
                handler.css('left', position);
                handler.text(ui.values[0]);
            }
            if (ui.handleIndex == 1) {
                const handler = $( `#${sliderId} span[name='end-value']` );
                const position = $(ui.handle).css('left');
                handler.css('left', position);
                handler.text(ui.values[1]);
            }
        },
        change: function( _, ui ) {
            const attributeName = getSliderAttr(sliderId);
            if (!attributeName) return;
            const filters = JSON.parse(sessionStorage.getItem('filters'));
            if (ui.handleIndex == 0 && filters) {
                updateFilters(filters, `${attributeName}_min`, ui.values[0]);
            }
            if (ui.handleIndex == 1 && filters) {
                updateFilters(filters, `${attributeName}_max`, ui.values[1]);
            }
            sessionStorage.setItem('filters', JSON.stringify(filters));
            showCatalog();
        }
    });
}

const renderDiscreteSlider = (sliderId, steps) => {

    $( `#${sliderId}` ).slider({
        range: true,
        min: 0,
        max: steps.length - 1,
        values: [0, steps.length - 1],
        create: function(event, ui) {
            const currentWidget = $(this).slider('widget');
            const handlers = currentWidget.find('.ui-slider-handle');
            $(handlers[1]).css('left', '100%');
            $(handlers[0]).css('display', 'none');
        },
        slide: function( event, ui ) {
        },
        change: function( _, ui ) {
            const value = steps[ui.value];
            const attributeName = getSliderAttr(sliderId);
            const filters = JSON.parse(sessionStorage.getItem('filters'));
            if (filters && attributeName) {
                updateFilters(filters, `${attributeName}_min`, 0);
            }
            if (value && filters && attributeName) {
                updateFilters(filters, `${attributeName}_max`, value);
            }
            sessionStorage.setItem('filters', JSON.stringify(filters));
            showCatalog();
        }
    });
}


function showSliders() {

    renderSlider('weight-range', 0, 150, 0.1, 0, 150);
    renderSlider('price-range', 500, 150000, 1, 500, 150000);
    renderDiscreteSlider('quantity-range', [1, 4, 10, 40, 50, 100]);
    renderSlider('instok-range', 0, 1000, 1, 0, 1000);

}


export default showSliders;

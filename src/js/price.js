import * as settings from './settings.js';

const calculatePrice = (clientPrice, weight=0) => {
    let result = parseFloat(clientPrice);
    if (weight) 
        result = (parseFloat(clientPrice) * weight).toFixed(2);

    return result;
}


const calculateMaxPrice = (maxPrice, weight=0) => {
    let result = 0;
    if (parseFloat(maxPrice) > 0) {
        if (weight) result = (parseFloat(maxPrice) * weight).toFixed(2);
    }

    return result;
}

export const getUnitRepr = (unit) => {
    if (unit == settings.GRAMME)
        return 'г';
    return 'шт';
}


function getPrice(clientPrice, maxPrice, clientDiscount, weight=0, unit='163') {
    const result = {'clientPrice': 0, 'clientDiscount': 0, 'clientDiscountPrice': 0, 'maxPrice': 0};

    let price = calculatePrice(clientPrice, weight);
    if (unit == settings.PIECE) price = calculatePrice(clientPrice);
    if (!price) return result;

    result['clientPrice'] = price;
    result['clientDiscount'] = clientDiscount;    

    if (clientDiscount) {
        result['clientDiscountPrice'] = (price - (price * clientDiscount / 100)).toFixed(2);
    }

    result['maxPrice'] = calculateMaxPrice(maxPrice, weight);

    return result;
}

export default getPrice;

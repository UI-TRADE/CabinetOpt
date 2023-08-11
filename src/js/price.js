const getDefaultSize = (productId, collection, sizes, gender) => {
    let defaultSize = 0; if (!sizes) return;

    try {
        defaultSize = sizes.sort((firstItem, nextItem) => {
            if (firstItem['fields'].size < nextItem['fields'].size) return -1;
            if (firstItem['fields'].size > nextItem['fields'].size) return 1;
            return 0;
        }).find(_ => true)['fields'].size;
    } catch {}

    if (collection) {
        if (['кольцо', 'кольца', 'колечки', 'колец'].find(el => el == collection.toLowerCase().trim())) {
            if (sizes.find(
                el => el['fields'].product == productId && el['fields'].size == 20
            )) defaultSize = 20;
            if (gender == 'женский' | gender == 'Ж') {
                if (sizes.find(
                    el => el['fields'].product == productId && el['fields'].size == 17
                )) defaultSize = 17;    
            }
        }
        if (['цепь', 'цепи', 'цепочка', 'цепочек'].find(el => el == collection)) {
            if (sizes.find(
                el => el['fields'].product == productId && el['fields'].size == 50
            )) defaultSize = 50;
        }
    }

    const foundSizes = sizes.filter(el => el['fields'].product == productId && el['fields'].size == defaultSize);

    return foundSizes.sort((firstItem, nextItem) => {
        if (firstItem['fields'].weight < nextItem['fields'].weight) return 1;
        if (firstItem['fields'].weight > nextItem['fields'].weight) return -1;
        return 0;
    }).find(_ => true);

}


const calculatePrice = (clientPrice, weight=0) => {
    let result = parseFloat(clientPrice);
    if (weight) result = (parseFloat(clientPrice) * weight).toFixed(2);

    return result;
}


const calculateMaxPrice = (maxPrice, weight=0) => {
    let result = 0;
    if (parseFloat(maxPrice) > 0) {
        if (weight) result = (parseFloat(maxPrice) * weight).toFixed(2);
    }

    return result;
}


function getPrice(clientPrice, maxPrice, clientDiscount, weight=0) {
    const result = {'clientPrice': 0, 'clientDiscount': 0, 'clientDiscountPrice': 0, 'maxPrice': 0};

    const price = calculatePrice(clientPrice, weight);
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

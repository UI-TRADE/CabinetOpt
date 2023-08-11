import updateProducts from './catalog_cards';


const loadJson = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return []
    return JSON.parse(document.querySelector(selector).getAttribute('data-json'));
}


function initProductFilters() {

    const fillCollectionTree = (collections, collectionElement, excludedCollection) => {

        const groups = []; 
        const excludedCollections = excludedCollection.split(','); 
        
        if (!collectionElement) return;

        collections.forEach((item) => {
            if (!groups.find(el => el == item.group_name)) groups.push(item.group_name)
        });
       
        collectionElement.innerHTML = '';

        groups.forEach((group) => {

            let innerHTML = 
            `<li class="list-group-item">
                <span class="collection-box">${group}</span>
                <ul class="collection-nested list-group list-group-flush">`;
    
            const foundCollections = collections.filter(el => el.group_name == group);
            foundCollections.forEach((collection) => {
                const checked = (excludedCollections.find(el => el === `collection-${collection['id']}`)) ? "" : "checked";
                innerHTML += 
                    `<li class="list-group-item" style="padding-top: 5px; padding-bottom: 5px; margin-left: 25px;">
                        <input class="form-check-input me-1 filter-control" type="checkbox" value="collection" id="collection-${collection['id']}" ${checked}>
                        <label class="form-check-label" for="collection-${collection['id']}" style="font-size: smaller;">${collection['name']}</label>
                    </li>`;
            });

            innerHTML += '</ul></li>'
            collectionElement.innerHTML += innerHTML;
        });
    }    

    if (document.location.pathname !== "/catalog/products/") {
        return;
    }

    const data = {'brand': [], 'collection': []};
    const excludedВrands = localStorage.getItem('excludedВrands');
    const excludedCollection = localStorage.getItem('excludedCollection');
    const filters = JSON.parse(sessionStorage.getItem('filters'));

    const brandList = document.querySelector('.brend-group'); 
    loadJson('#brands').forEach((brand) => {
        const checked = (excludedВrands.includes(`brand-${brand.pk}`)) ? "" : "checked"
        brandList.innerHTML += 
        `<li class="list-group-item">
            <input class="form-check-input me-1 filter-control" type="checkbox" value="brand" id="brand-${brand.pk}" ${checked}>
            <label class="form-check-label" for="brand-${brand.pk}">${brand.fields.name}</label>
        </li>`
    });
    data['brand'] = excludedВrands.split(',');

    fillCollectionTree(loadJson('#collections'), document.querySelector('.collection-group'), excludedCollection);
    data['collection'] = excludedCollection.split(',');

    Object.keys(filters).forEach(key => {
        const filter_field = document.querySelector(`.filter-control[name="${key}"]`);
        if (filter_field.tagName == 'INPUT') filter_field.value = filters[key];
        if (filter_field.tagName == 'SELECT') {
            const selectionItems = filter_field.children;
            for (var i=0; i<selectionItems.length; i++) {
                selectionItems[i].selected = false;
                if (selectionItems[i].value == filters[key]) selectionItems[i].selected = true;
            }
        }
        data[key] = filters[key];
    });

    updateProducts('products', {
        'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
        'data': JSON.stringify(data)
    });
}


export function catalogEvents() {

    const showElement = (elementId, show) => {
        document.getElementById(elementId).style.display = show ? 'block' : 'none';
    }

    const toggleClassButton = (target, fromClass, toClass) => {
        const classes = target.classList;
        if ( classes.contains(fromClass) ) {
            classes.add(toClass);
            classes.remove(fromClass);
        } else if ( classes.contains(toClass) ) {
            classes.add(fromClass);
            classes.remove(toClass);
        }
    }

    const collectionBoxToggler = document.getElementsByClassName('collection-box');
    for (var i = 0; i < collectionBoxToggler.length; i++) {
        collectionBoxToggler[i].addEventListener('click', (event) => {
        if (event.target.parentElement) {
            event.target.parentElement.querySelector('.collection-nested')?.classList.toggle('collection-active');
            event.target.classList.toggle('collection-open-box');
        }
      });
    }

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
    });
    
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
    });

    $('.filter-control').on('change', (event) => {
        const data = {'brand': [], 'collection': []};
        const allFilters = document.querySelectorAll('.filter-control');
        allFilters.forEach((element) => {
            if (!element.value) return;
            if (element.value == 'brand' || element.value == 'collection') {
                if (!element.checked) data[element.value].push(element.id);
            } else {
                data[`${element.name}`] = element.value;
            }
        });

        localStorage.setItem('excludedВrands', data.brand);
        localStorage.setItem('excludedCollection', data.collection);
        sessionStorage.setItem(
            'filters',
            JSON.stringify(Object.fromEntries(
                Object.entries(data).filter(
                    item => !['brand', 'collection'].includes(item[0])
        ))));
        
        updateProducts('products', {
            'csrfmiddlewaretoken' : document.querySelector('input[name="csrfmiddlewaretoken"]').value,
            'data': JSON.stringify(data)
        });
    });
}


export default initProductFilters;

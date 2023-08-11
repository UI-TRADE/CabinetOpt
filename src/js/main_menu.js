const selectMenuItem = (element) => {
    sessionStorage.setItem('selectedURI', element.dataset.url);
    window.location.href = element.dataset.url;
}

function mainMenuEvents() {
    $('.main__menu__item').on('click', (event) => {
        selectMenuItem(event.currentTarget);
    });
}


export default mainMenuEvents;

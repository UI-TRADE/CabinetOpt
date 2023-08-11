function ordersEvents() {
    // $('.order-row').click((event) => {
    //     window.document.location = event.currentTarget.dataset.href
    // });

    const orderBoxToggler = document.getElementsByClassName('order-box');
    for (var i = 0; i < orderBoxToggler.length; i++) {
        orderBoxToggler[i].addEventListener('click', (event) => {
            const order_id = event.target.id.replace(/[^\d.]/g, '');;
            if (order_id) {
                document.querySelector(`#order-nested-${order_id}`)?.classList.toggle('order-active');
                event.target.classList.toggle('order-open-box');
            }
        });
    }
}

export default ordersEvents;

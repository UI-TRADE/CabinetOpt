import orderEvents, {updateOrder} from "./order";

function ordersEvents() {
    // $('.order-row').click((event) => {
    //     window.document.location = event.currentTarget.dataset.href
    // });

    var orderRequest = undefined;
    function loadOrder(orderLink){
        return $.ajax({
            url: orderLink,
            method: "get",
        })
    }

    $(".order-list .order-item__title").on("click", function (e){
        e.preventDefault();
        if(orderRequest){
            orderRequest.abort()
        }
        orderRequest = loadOrder($(this).attr("href"))
        orderRequest.then(function(html){
                const DOMModel = new DOMParser().parseFromString(html, 'text/html');
                $(DOMModel.querySelector("#order-item")).appendTo($("#order").empty())
                initOrderInfo()
            })
    })

    function initOrderInfo(){
        const orderTableItems = $('#order-items');

        if(orderTableItems.length) {
            orderTableItems.tablesorter({
                textExtraction: {
                    '.articul' : function(node, table, cellIndex) {
                        return "#"  + $(node).text();
                    },
                    '.quantity' : function(node, table, cellIndex) {
                        return $(node).find("input").val();
                    }
                }
            })
        }

        orderEvents()
        updateOrder()
    }

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

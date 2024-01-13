const initAccountInfo = () => {
    const orderTableItems = $('#orders-items');

    if(orderTableItems.length) {
        orderTableItems.tablesorter({
            textExtraction: {
                '.order' : function(node, table, cellIndex) {
                    return "#"  + $(node).text();
                },
                '.data' : function(node, table, cellIndex) {
                    return "#"  + $(node).text();
                },
                '.status' : function(node, table, cellIndex) {
                    return "#"  + $(node).text();
                }
            }
        })
    }
}

export function contactEvents(){
    initAccountInfo();
}

function updateContactView(formId) {
    $.ajax({
        url: $(`#${formId}`).attr('action'),
        success: (data) => {
            $(`#${formId}`).html(data);
        },
        error: (xhr, status, error) => {
            alert('Ошибка: ' + error);
        }
    });
}

export default updateContactView;

import { handleError } from "./utils/exceptions";

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
    const url = $(`#${formId}`).attr('action');
    if(url){
        $.ajax({
            url: url,
            success: (data) => {
                $(`#${formId}`).html(data);
            },
            error: (xhr, status, error) => {
                handleError(error, 'Ошибка обновления контактных данных');
            }
        });
    }
}

export default updateContactView;

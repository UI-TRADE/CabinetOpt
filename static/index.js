const removeErrors = function() {
    Array.from(document.getElementsByClassName('errors')).forEach((item) => {
        while (item.firstChild) {
            item.removeChild(item.firstChild);
        }
    });
}


const showErrors = function(errors) {
    removeErrors();
    $.each(JSON.parse(errors), (name, error) => {
        error.forEach((item) => {
            const newError = document.createElement('p');
            newError.textContent = item['message'];
            Array.from(document.getElementsByClassName(`${name}-error`)).forEach((element) => {
                element.appendChild(newError);
            });
        });
    });
}


$(document).ready(() => {
    // show modal form
    $('#regRequestForm').on('shown.bs.modal', (event) => {
        $.ajax({
            url: event.relatedTarget.getAttribute('data-url'),
            success: (data) => {
                $('.modal').html(data);
            },
            error: (xhr, status, error) => {
                alert('Ошибка: ' + error);
            }
        });
    });
    // update and close modal form
    $('#regRequestForm').on('submit', (event) => {
        event.preventDefault();
        $.ajax({
            type: 'POST',
            url: event.target.action,
            data: $('.registration-form').serialize(),
            success: (data) => {
                console.log(data['errors']);
                if(data['errors']) {
                    showErrors(data['errors']);
                    data['errors'] = {}
                } else {
                    $('.modal').modal('hide');
                    location.reload();
                }
            },
            error: (response) => {
                const errors = JSON.parse(response.responseText).errors;
                showErrors(errors);
            }
        });
    });
});


const showErrors = (formId, errors) => {
    const form = document.querySelector(`[id="${formId}"]`);
    if (!form) return;
    const invalidFields = form.querySelectorAll('.is-invalid');
    invalidFields.forEach(item => {
        item.classList.remove('is-invalid');
        item.placeholder = '';    
    });
    $.each(JSON.parse(errors), (name, error) => {
        error.forEach(item => {
            const invalidField = form.querySelector(`input[name=${name}]`);
            if (invalidField) {
                invalidField.classList.add('is-invalid');
                invalidField.value = '';
                invalidField.placeholder = item['message'];
            }
        });
    });
}


const updateModalForm = (formId) => {
    $(`#${formId}`).on('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        $.ajax({
            type: 'POST',
            url: event.target.action,
            data: formData,
            processData: false,
            contentType: false,
            success: (data) => {
                if(data['errors']) {
                    showErrors(formId, data['errors']);
                    data['errors'] = {}
                } else if(data['redirect_url']) {
                    location.replace(data['redirect_url']);
                } else {
                    if ($(event.target).hasClass('registration-form')) {
                        $('#registration-form').html(data);
                    } else {
                        $('.modal').modal('hide');
                        location.reload();
                    }
                }
            },
            error: (error) => {
                alert('Ошибка обновления формы: ' + error);
            }
        });
    });
}


const renderModalForm = (data, targetId, submitFormId) => {
    const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
    const currentForm = reloadHtml.querySelector('form');
    currentForm.id = submitFormId;
    $(`#${targetId}`).html(currentForm.outerHTML);
}


export function showChangePassErrors() {
    if (!$('#change-pass-errors').length) return;
    const dataError = $('#change-pass-errors').attr('data-error')
    if (!dataError) return;
    const errors = JSON.parse(dataError);
    for (var key in errors) {
        if (errors.hasOwnProperty(key)) {
            let element = $(`input[name=${key}]`)
            if (element) {
                element.attr('placeholder', errors[key]);
                element.addClass('is-invalid');
            }
        }
    }
}


export function switchModalForm(idFrom, idTo, submitFormId) {
    $(document).on('click', `#${idFrom}` , event =>{
        $.ajax({
            url: event.currentTarget.getAttribute('data-url'),
            success: (data) => {
                renderModalForm(data, idTo, submitFormId);
                updateModalForm((submitFormId) ? submitFormId : idTo);
            },
            error: (xhr, status, error) => {
                alert('Ошибка переключения формы: ' + error);
            }
        });
    });
}


function showModalForm(formId, submitFormId) {
    $(document).on('show.bs.modal',`#${formId}`, (event) => {
        $.ajax({
            url: event.relatedTarget.getAttribute('data-url'),
            success: (data) => {
                renderModalForm(data, formId, submitFormId);
                updateModalForm((submitFormId) ? submitFormId : formId);
            },
            error: (xhr, status, error) => {
                alert('Ошибка открытия формы: ' + error);
            }
        });
    });
}


export default showModalForm;

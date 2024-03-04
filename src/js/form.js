import { handleError } from "./utils/exceptions";

const applyShowPasswordButtons = ($modal) => {
    const $btnWrappers = $modal.find('.show-password-btn-wrapper');
    for (let i = 0; i < $btnWrappers.length; i+=1) {
        const parent = $btnWrappers[i].parentElement;
        const button = $btnWrappers[i].querySelector('button');
        const crossedEyeIcon = $btnWrappers[i].querySelector('.show-password-btn-wrapper__eye-icon.crossed');
        const eyeIcon = $btnWrappers[i].querySelector('.show-password-btn-wrapper__eye-icon');
        const input = parent.querySelector('input');
        $(button).click(() => {
            crossedEyeIcon.classList.toggle('hidden');
            eyeIcon.classList.toggle('hidden');
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        });
    }
};

const showErrors = (formId, errors) => {
    const form = document.querySelector(`[id="${formId}"]`);
    if (!form) return;
    const errorsField = form.querySelector('.auth-form-errors');
    if (errorsField) {
        const errorMessages = new Array;
        $.each(JSON.parse(errors), (_, error) => {
            error.forEach(item => {
                errorMessages.push(item['message']);    
            });
        });
        if (errorMessages.length > 0) errorsField.textContent = errorMessages.join('\n');
    } else {
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
                handleError(error, 'Ошибка обновления формы');
            }
        });
    });
}


const renderModalForm = (data, targetId, submitFormId) => {
    const reloadHtml = new DOMParser().parseFromString(data, 'text/html');
    let currentForm = reloadHtml.querySelector('form');
    const $modal = $(`#${targetId}`);
    currentForm.id = submitFormId;
    $modal.html(currentForm.outerHTML);
    applyShowPasswordButtons($modal);
    return;
}

function showChangePassErrors() {
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

export const showChangePassForm = () => {
    const $form = $('#change-pass-form');
    if ($form.length) {
        showChangePassErrors();
        applyShowPasswordButtons($form);
    }
};

export function switchModalForm(idFrom, idTo, submitFormId) {
    $(document).on('click', `#${idFrom}` , event =>{
        $.ajax({
            url: event.currentTarget.getAttribute('data-url'),
            success: (data) => {
                renderModalForm(data, idTo, submitFormId);
                updateModalForm((submitFormId) ? submitFormId : idTo);
            },
            error: (xhr, status, error) => {
                handleError(error, 'Ошибка переключения формы');
            }
        });
    });
}


export function showAuthForm(submitFormId, auth='login') {
    $.ajax({
        url: `clients/${auth}`,
        success: (data) => {
            renderModalForm(data, 'registration-form', submitFormId);
            updateModalForm(submitFormId);
        },
        error: (xhr, status, error) => {
            handleError(error, 'Ошибка открытия формы');
        }
    });
}

export function modalFormEvents() {
    $('#registration-form-switch').click((event) => {
        $.ajax({
            url: event.currentTarget.getAttribute('data-url'),
            success: (data) => {
                renderModalForm(data, 'registration-form', submitFormId);
                updateModalForm(submitFormId);
            },
            error: (xhr, status, error) => {
                handleError(error, 'Ошибка открытия формы');
            }
        });
    });
    $('a[name="login"]').click((event) => {
        sessionStorage.setItem('auth', 'login');
        window.location.replace(event.currentTarget.getAttribute('data-url'));
    //     $.ajax({
    //         url: 'clients/login',
    //         success: (data) => {
    //             renderModalForm(data, 'registration-form', submitFormId);
    //             updateModalForm(submitFormId);
    //         },
    //         error: (xhr, status, error) => {
    //             handleError(error, 'Ошибка открытия формы');
    //         }
    //     });
    });
    $('a[name="logout"]').click((event) => {
        sessionStorage.setItem('auth', 'login');
        window.location.replace(event.currentTarget.getAttribute('data-url'));
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
                handleError(error, 'Ошибка открытия формы');
            }
        });
    });
}


export default showModalForm;

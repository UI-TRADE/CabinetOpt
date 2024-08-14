import generateUUID from './lib';
import { handleError } from "./utils/exceptions";


export const applyShowPasswordButtons = ($modal) => {
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
}


const updateCaptcha = () => {
    $.getJSON("/captcha/refresh/", function (result) {
        $('.captcha').attr('src', result['image_url']);
        $('#id_captcha_0').val(result['key'])
    });
}


export const bindEventToCaptcha = (targetId) => {
    $(`#${targetId} img`).on("click", () =>{
        updateCaptcha();
    });
}


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
                let invalidField = form.querySelector(`input[name=${name}]`);
                if (name == 'captcha')
                    invalidField = form.querySelector('input[name=captcha_1]');
                if (invalidField) {
                    invalidField.classList.add('is-invalid');
                    invalidField.value = '';
                    invalidField.placeholder = item['message'];
                }
            });
        });
    }
}


export const updateModalForm = (formId) => {
    $(`#${formId}`).on('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        $.ajax({
            url: event.target.action,
            type: 'POST',
            headers: {
                'X-Client-Id': localStorage.getItem('client_id')
            },
            data: formData,
            processData: false,
            contentType: false,
            success: (data) => {
                if(data['errors']) {
                    showErrors(formId, data['errors']);
                    data['errors'] = {}
                    updateCaptcha();
                } else if(data['redirect_url']) {
                    location.replace(data['redirect_url']);
                } else if ($(event.target).hasClass('login-form')) {
                    const submitFormId = generateUUID();
                    renderModalForm(data, 'registration-form', submitFormId);
                    updateModalForm(submitFormId);
                } else if($.parseHTML(data).filter(value => $(value).hasClass('login-recovery-form')).length) {
                    $('#registration-form').html(data);
                } else {
                    if ($(event.target).hasClass('registration-form') || 
                        $(event.target).hasClass('login-recovery-form')) {
                        $('#registration-form').html(data);
                        // После успешной регистрации ожидаем увидеть форму входа
                        sessionStorage.setItem('auth', 'login');
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
    bindEventToCaptcha(targetId);
    applyShowPasswordButtons($modal);
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


/**
 * Переключает модельные формы.
 *
 * idFrom - id элемента при клике на который переключается форма.
 * idTo - id контейнера формы в котором рендеряться формы (registration-form).
 * submitFormId - id формы которую переключаем
 * 
 */
export function switchModalForm(idFrom, idTo, submitFormId) {
    $(document).on('click', `#${idFrom}` , event =>{
        $.ajax({
            url: event.currentTarget.getAttribute('data-url'),
            headers: {
                'X-Client-Id': localStorage.getItem('client_id')
            },
            success: (response) => {
                renderModalForm(response, idTo, submitFormId);
                updateModalForm((submitFormId) ? submitFormId : idTo);
                modalFormEvents();
            },
            error: (xhr, status, error) => {
                handleError(error, 'Ошибка переключения формы');
            }
        });
    });
}


export function modalFormEvents() {

    $('a[name="login"]').click((event) => {
        sessionStorage.setItem('auth', 'login');
        window.location.replace(event.currentTarget.getAttribute('data-url'));
    });
    $('a[name="logout"]').click((event) => {
        sessionStorage.setItem('auth', 'login');
        window.location.replace(event.currentTarget.getAttribute('data-url'));
    });
    $('a[name="forgot-password"]').click((event) => {
        event.preventDefault();
        showAuthForm(generateUUID(), 'login_recovery');
    });
    $('a[name="add-new-manager"]').click((event) => {
        event.preventDefault();
        showModalForm('add-manager-form', generateUUID(), 'manager/add');
    });
    $('a[name="share-link-dialog"]').click((event) => {
        event.preventDefault();
        const $link = $('#share-link-form input').val();
        if ($link)
            try {
                if(navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText($link)
                    .then(() => {
                        $('.share-link-alert').toggleClass('share-link-active');
                        setTimeout(() => {
                            $('.share-link-alert').toggleClass('share-link-active');
                        }, 1000);
                    })
                    .catch(error => {
                        throw error;
                    });
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = $link;
                    textarea.style.position = 'absolute';
                    textarea.style.left = '-99999999px';
                    document.body.prepend(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                    } catch (error) {
                        throw error;    
                    } finally {
                        textarea.remove();
                        $('.share-link-alert').toggleClass('share-link-active');
                        setTimeout(() => {
                            $('.share-link-alert').toggleClass('share-link-active');
                        }, 1000);
                    }
                }
            } catch {
                $('.background-overlay').removeClass('hidden');
                $('#share-link-form').removeClass('hidden');
                $('#share-link-form #share-link').focus();
                $('#share-link-form #share-link').select();
                $('.background-overlay').click(
                    function(){
                        const $modal = $('#share-link-form');
                        const $overlay = $('.background-overlay');
                        $modal.addClass('hidden');
                        $overlay.addClass('hidden');
                        $overlay.off();    
                    }
                );
            }
    });
} 


function showModalForm(formId, submitFormId, uri) {
    $.ajax({
        url: `/clients/${uri}`,
        headers: {
            'X-Client-Id': localStorage.getItem('client_id')
        },
        success: (response) => {
            renderModalForm(response, formId, submitFormId);
            updateModalForm(submitFormId);
            modalFormEvents();
            $('.background-overlay').removeClass('hidden');
            $(`#${formId}`).removeClass('hidden');
            $('.background-overlay').click(
                function(){
                    const $modal = $(`#${formId}`);
                    const $overlay = $('.background-overlay');
                    $modal.html('');
                    $modal.addClass('hidden');
                    $overlay.addClass('hidden');
                    $overlay.off();    
                }
            );
        },
        error: (xhr, status, error) => {
            handleError(error, 'Ошибка открытия формы');
        }
    });

}


function showAuthForm(submitFormId, auth='login') {
    $.ajax({
        url: `/clients/${auth}`,
        headers: {
            'X-Client-Id': localStorage.getItem('client_id')
        },
        success: (response) => {
            renderModalForm(response, 'registration-form', submitFormId);
            updateModalForm(submitFormId);
            modalFormEvents();
        },
        error: (xhr, status, error) => {
            handleError(error, 'Ошибка открытия формы');
        }
    });
}


export default showAuthForm;

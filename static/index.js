$(document).ready(() => {
    $('#regRequestForm').on('shown.bs.modal', () => {
        $.ajax({
            url: "{% url 'clients:add_request' %}",
            success: (data) => {
                console.log(data)
                $('.modal').html(data);
            },
            error: (xhr, status, error) => {
                alert('Ошибка: ' + error);
            }
        });
    })
});

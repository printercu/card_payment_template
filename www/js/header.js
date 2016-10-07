$(document).ready(function () {
    var MAX_DESCRIPTION_LENGHT = 50;

    /**
     * Отображение / скрытие полного описания заказа при нажатии на кнопку
     */
    function order_info() {
        var text_length = $('.js_header_order_info_text').text().length;
        var parent = $('.js_header_order_info');
        var more = $('.js_header_order_info_more');
        var close = $('.js_header_order_info_close');

        if (text_length > MAX_DESCRIPTION_LENGHT) {
            more.show();
        }
        else {
            more.hide();
        }

        more.on('click', function () {
            parent.addClass('is_active');
            return false;
        });

        close.on('click', function () {
            parent.removeClass('is_active');
            return false;
        });
        parent.click(function (event) {
            event.stopPropagation();
        });
    }
    order_info();
});
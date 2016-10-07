// Fix for IE9
// if (!window.console) console = {log: function() {}}; // В IE нет класса console
window.console = window.console || {
    log: function () {
    }
};
// End fix for IE9

Object.keys = Object.keys || function (o) {
    var result = [];
    for (var name in o) {
        if (o.hasOwnProperty(name))
            result.push(name);
    }
    return result;
};

jQuery.extend({
    postJSON: function (url, data, callback) {
        return jQuery.post(url, data, callback, "json");
    }
});

/*
 * Форма для ввода данных банковской карты
 * на будущее можно добавить:
 * 1. отдельные обработчики для полей форм(допустим вставка сообщения в поле message в info_form
 * 2. добавление пользовательских форм
 * 3. при ответе reload, возможность отобразить сообщение
 * 4. исключить мерцания при очистки полей от плохих символов
 */
(function ($) {
//'use strict';


    /**
     * Constants
     */
    MAXLENGTH_ATTRIBUTE = 'maxlength',
    LOADER_REFERSH_ACTION_TIMEOUT = 2,
    LOADER_SHOTDOWN_TIMEOUT = 30,
    /*
     * Поля для формы оплаты 
     */
    ID_CARD_INPUT_FORM = 'card_input_form',
    NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD = 'card_num_1',
    NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD = 'card_num_2',
    NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD = 'card_num_3',
    NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD = 'card_num_4',
    NAME_CARD_INPUT_FORM_CARD_NUM_FIELD = 'card_num',
    NAME_INPUT_FORM_PHONE_FIELD = 'user_phone',
    NAME_INPUT_FORM_EMAIL_FIELD = 'user_contact_email',
    NAME_INPUT_FORM_PS_ADDITIONAL_FIELDS = 'ps_additional_field',
    NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD = 'exp_month',
    NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD = 'exp_year',
    NAME_CARD_INPUT_FORM_EXP_DATE_FIELD = 'exp_date',
    NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD = 'name_on_card',
    NAME_CARD_INPUT_FORM_CARD_CVC_FIELD = 'card_cvc',
    /*
     * Поля для формы loader
     */
    ID_LOADER_FORM = 'loader_form',
    ID_LOADER_FORM_INFO_BY_IDLE_TRANSACTION = 'info_by_idle_transaction';
    ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION = 'info_by_hold_transaction';

    ID_INFO_FORM = 'info_form',
    NAME_INFO_FORM_MESSAGE_FIELD = 'message',
    ID_FORM_FADER = 'form_fader',
    ID_PS_HIDDEN_NAME = 'ps_name',
    PLUGIN_NAME = undefined; // определяется каждый раз при работе по одной из форм

    /**
     * Константы для отображения общей платежной страницы
     */
    COMMON_PAYMENT_FORM_ACTIVE_CLASS = 'is_active';
    MAX_DESCRIPTION_LENGHT = 50;


    /*
     * Опера не можеть работать со вставкой данных из буфера обмена. Поэтому для
     * оперы мы немного меняем поведение формы. А это флаг определяющий это 
     * поведение
     * @type Boolean
     */
    var isOpera = !!window.opera;

    var
        cb_urls = {
            'action_url': 'payment_cb/get_action.php',
            'check_card_data_url': 'payment_cb/check_card_data_payment.php',
            'check_simple_data_url': 'payment_cb/check_simple_data_payment.php',
        },
        customer = undefined,
        key = undefined,
        tick = {
            'value': undefined,
            'get': function () {
                return tick.value;
            },
            'set': function (value) {
                tick.value = value;
            }
        },
    // настройки по умолчанию
    default_settings = {
        'form_type': 'card_form',
        'accepted_card_brands': ['VISA', 'VISA ELECTRON', 'MASTERCARD', 'MAESTRO'],
        'min_card_number_length': undefined,
        'max_card_number_length': undefined,
        'min_card_cvc_length': undefined,
        'max_card_cvc_length': undefined,
        'min_name_on_card_length': undefined,
        'max_name_on_card_length': undefined,
        'min_phone_length': 7,
        'max_phone_length': 14,
        'max_email_length': 50,
        // Обработчики для отображения ошибок
        'ok_setter': [],
        'error_setter': [],
        'nothing_setter': [],
        // Валидаторы для подмены
        'validators': [],
        // Обработчики привязываемые к полям
        'handlers': [],
        'repliers': [],
    },
    // настройки, которые можно передать при вызове плагина и переопределить ими default_settings
    settings = {},
    // Поля по умолчанию происходить работа
    default_fields = {
        'card_num_fields': undefined,
        'card_num_field_lengths': [],
        'card_num_fields_total_lengths': undefined,
        'card_num': undefined,
        'exp_date_fields': undefined,
        'exp_date_field_lengths': [],
        'exp_date_fields_total_lengths': undefined,
        'exp_date': undefined,
        'exp_date_type': undefined,
        'name_on_card': undefined,
        'card_cvc': undefined,
        'phone': undefined,
        'phone_field_lengths': [],
        'email': undefined,
        'ps_additional_fields': undefined
    },
    // поля в форме с которыми может происходить работа
    fields = {},
    // данные, сохраненные после инициализации плагина для использования другими методами
    plugin_init_data = {};
    init_common = false;

    var
            /*
             * Установка полей и формы в состояние ок. т.е. поля верно введены
             * @type @exp;settings@arr;ok_setter
             */
            ok_setter = {
                form: function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('from: status ok');
                    data['info_form'].removeClass("field_error").addClass("field_ok");
                    fields.message.text('');
                    forms.show_form.apply(this, [ID_INFO_FORM]);
                },
                card_num_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num_fields: status ok');
                    fields.card_num_fields.each(function (i) {
                        $(this).removeClass("field_error").addClass("field_ok");
                    });
                },
                card_num: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num: status ok');
                    fields.card_num.removeClass("field_error").addClass("field_ok");
                },
                exp_date_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date_fields: status ok');
                    fields.exp_date_fields.each(function (i) {
                        $(this).removeClass("field_error").addClass("field_ok");
                    });
                },
                exp_date: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date: status ok');
                    fields.exp_date.removeClass("field_error").addClass("field_ok");
                },
                name_on_card: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('name_on_card: status ok');
                    fields.name_on_card.removeClass("field_error").addClass("field_ok");
                },
                card_cvc: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('name_on_card: status ok');
                    fields.card_cvc.removeClass("field_error").addClass("field_ok");
                },
                phone: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('phone: status ok');
                    fields.phone.removeClass("field_error").addClass("field_ok");
                },
                email: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('email: status ok');
                    fields.email.removeClass("field_error").addClass("field_ok");
                },
                ps_additional_field: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log($(this).attr('name') + ': status ok');
                    $(this).removeClass("field_error").addClass("field_ok");
                }
            },
            /*
             * Установка полей и формы в состояние error. т.е. поля введены неверно
             * @type @exp;settings@arr;error_setter
             */
            error_setter = {
                form: function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('from: status error');
                    data['info_form'].removeClass("field_ok").addClass("field_error");
                    fields.message.text(text);
                    forms.show_form.apply(this, [ID_INFO_FORM]);
                },
                card_num_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num_fields: status error');
                    fields.card_num_fields.each(function (i) {
                        $(this).removeClass("field_ok").addClass("field_error");
                    });
                },
                card_num: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num: status error');
                    fields.card_num.removeClass("field_ok").addClass("field_error");
                },
                exp_date_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date_fields: status error');
                    fields.exp_date_fields.each(function (i) {
                        $(this).removeClass("field_ok").addClass("field_error");
                    });
                },
                exp_date: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date: status error');
                    fields.exp_date.removeClass("field_ok").addClass("field_error");
                },
                name_on_card: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('name_on_card: status error');
                    fields.name_on_card.removeClass("field_ok").addClass("field_error");
                },
                card_cvc: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_cvc: status error');
                    fields.card_cvc.removeClass("field_ok").addClass("field_error");
                },
                phone: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('phone: status error');
                    fields.phone.removeClass("field_ok").addClass("field_error");
                },
                email: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('email: status error');
                    fields.email.removeClass("field_ok").addClass("field_error");
                },
                ps_additional_field: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log($(this).attr('name') + ': status error');
                    $(this).removeClass("field_ok").addClass("field_error");
                }
            },
            /*
             * Установка полей и формы в состояние для ввода значений. поля очищаются от классов
             * @type @exp;settings@arr;nothing_setter
             */
            nothing_setter = {
                form: function (data, text, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('from: status nothing');
                    data['info_form'].removeClass("field_error").removeClass("field_ok");
                    fields.message.text('');
                    forms.show_form.apply(this, [ID_INFO_FORM]);
                },
                card_num_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num_fields: status nothing');
                    fields.card_num_fields.each(function (i) {
                        $(this).removeClass("field_ok").removeClass("field_error");
                    });
                },
                card_num: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_num: status nothing');
                    fields.card_num.removeClass("field_ok").removeClass("field_error");
                },
                exp_date_fields: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date_fields: status nothing');
                    fields.exp_date_fields.each(function (i) {
                        $(this).removeClass("field_ok").removeClass("field_error");
                    });
                },
                exp_date: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('exp_date: status nothing');
                    fields.exp_date.removeClass("field_ok").removeClass("field_error");
                },
                name_on_card: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('name_on_card: status nothing');
                    fields.name_on_card.removeClass("field_ok").removeClass("field_error");
                },
                card_cvc: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('card_cvc: status nothing');
                    fields.card_cvc.removeClass("field_ok").removeClass("field_error");
                },
                phone: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('phone: status nothing');
                    fields.phone.removeClass("field_ok").removeClass("field_error");
                },
                email: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log('email: status nothing');
                    fields.email.removeClass("field_ok").removeClass("field_error");
                },
                ps_additional_field: function (fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    console.log($(this).attr('name') + ': status nothing');
                    $(this).removeClass("field_error").removeClass("field_ok");
                }
            };


    var
            // Валидация введенных данных
            validators = {
                /**
                 * проверка данных карты на frontend'е
                 * @param {array} cardFormParams данные карты из формы
                 * @returns {array}
                 */
                check_card_data: function (cardFormParams, settings) {
                    var arrErrors = {},
                            fields = plugin_init_data[PLUGIN_NAME].fields;

                    if ((typeof fields.exp_date !== 'undefined' && !validators.exp_date(cardFormParams[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD], settings))
                            || (typeof fields.exp_date_fields !== 'undefined' && !validators.exp_date(cardFormParams[NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD] + "/" + cardFormParams[NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD], settings))
                            )
                        arrErrors[NAME_CARD_INPUT_FORM_EXP_DATE_FIELD] = 'Пожалуйста, введите действительную дату';

                    if ((!cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD] && !cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD]) ||
                            (typeof fields.card_num !== 'undefined' && !validators.card_num(cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD], settings))
                            || (typeof fields.card_num_fields !== 'undefined' && !validators.card_num(
                                    cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_1_FIELD] + cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_2_FIELD]
                                    + cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_3_FIELD] + cardFormParams[NAME_CARD_INPUT_FORM_CARD_NUM_4_FIELD], settings))
                            )
                        arrErrors[NAME_CARD_INPUT_FORM_CARD_NUM_FIELD] = 'Номер карты введен неверно';

                    if (!cardFormParams[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD] || !validators.name_on_card(cardFormParams[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD], settings))
                        arrErrors[NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD] = 'Имя владельца карты введено неверно';

                    if (!cardFormParams[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD] || !validators.card_cvc(cardFormParams[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD], settings))
                        arrErrors[NAME_CARD_INPUT_FORM_CARD_CVC_FIELD] = 'CVC карты введен неверно';

                    return arrErrors;
                },
                /**
                 * проверка не карточных данных на frontend'е
                 * @param {array} cardFormParams не карточные данные из формы
                 * @returns {array}
                 */
                check_simple_data: function (notCardFormParams, settings) {
                    var arrErrors = {};
                    // Если не пустое поле, валидное и не скрытое (если оно скрытое - оно не обязательно)
                    if (notCardFormParams.email
                            && methods.is_visible.apply(notCardFormParams.email)
                            && !validators.email(notCardFormParams.email, settings))
                        arrErrors[NAME_INPUT_FORM_EMAIL_FIELD] = 'Email введен неверно';

                    if (!validators.phone(notCardFormParams.phone, settings))
                        arrErrors[NAME_INPUT_FORM_PHONE_FIELD] = 'Телефон введен неверно';

                    if (notCardFormParams.ps_additional_fields) {
                        for (var field in notCardFormParams.ps_additional_fields) {
                            // Не ошибка, если поле не обязательное и пустое, или оно скрыто
                            if ((notCardFormParams.ps_additional_fields[field]['value'] === ''
                                    && notCardFormParams.ps_additional_fields[field]['required'] === '0')
                                    || !methods.is_visible.apply(notCardFormParams.ps_additional_fields[field]['element']))
                                continue;

                            var bResult = validators.ps_additional_field(notCardFormParams.ps_additional_fields[field]['value'], settings, notCardFormParams.ps_additional_fields[field]['pattern']);
                            if (!bResult) {
                                if (!arrErrors.ps_additional_fields)
                                    arrErrors.ps_additional_fields = {};

                                arrErrors.ps_additional_fields[field] = {
                                    'error': 'Поле введено неверно',
                                    // Устанавливаем для того, чтобы потом иметь возможность установить ошибку в это поле
                                    'element': notCardFormParams.ps_additional_fields[field]['element']
                                };
                            }
                        }
                    }

                    return arrErrors;
                },
                /**
                 * проверка номера карты
                 * @param {string} cardNumber номер карты
                 * @returns {Boolean}
                 */
                card_num: function (cardNumber, settings) {
                    // accept only spaces, digits and dashes
                    if (/[^0-9 -]+/.test(cardNumber))
                        return false;

                    cardNumber = cardNumber.replace(/\D/g, "");
                    if (cardNumber.length < settings.min_card_number_length || cardNumber.length > settings.max_card_number_length)
                        return false;

                    var nCheck = 0, nDigit = 0, bEven = false;

                    for (var n = cardNumber.length - 1; n >= 0; n--) {
                        var cDigit = cardNumber.charAt(n);
                        var nDigit = parseInt(cDigit, 10);
                        if (bEven) {
                            if ((nDigit *= 2) > 9)
                                nDigit -= 9;
                        }
                        nCheck += nDigit;
                        bEven = !bEven;
                    }
                    return (nCheck % 10) == 0;
                },
                /**
                 * проверка даты
                 * @param {string} expireDate дата в формате mm/yyyy или mm/yy
                 * @returns {Boolean}
                 */
                exp_date: function (expireDate, settings) {
                    var date;
                    try {
                        date = $.datepicker.parseDate("dd/mm/yy", "01/" + expireDate);
                        date = new Date(new Date(date).setMonth(date.getMonth() + 1));
                    }
                    catch (e) {
                        return false;
                    }
                    return date > (new Date());
                },
                /**
                 * проверка имени владельца карты
                 * @param {string} nameOnCard имя владельца карты
                 * @returns {Boolean}
                 */
                name_on_card: function (nameOnCard, settings) {
                    // accept only spaces, digits and dashes
                    if (/[^A-Za-z -]+/.test(nameOnCard))
                        return false;

                    nameOnCard = nameOnCard.replace(/[^A-Za-z -]/g, "");
                    if (nameOnCard.length < settings.min_name_on_card_length || nameOnCard.length > settings.max_name_on_card_length)
                        return false;

                    return true;
                },
                /**
                 * проверка cvc карты
                 * @param {string} сardCvc код cvc
                 * @returns {Boolean}
                 */
                card_cvc: function (cardCvc, settings) {
                    if (/[^0-9]+/.test(cardCvc))
                        return false;

                    cardCvc = cardCvc.replace(/\D/g, "");
                    if (cardCvc.length < settings.min_card_cvc_length || cardCvc.length > settings.max_card_cvc_length)
                        return false;

                    return true;
                },
                /**
                 * Проверка номера телефона
                 * @param {string} phone
                 * @returns {Boolean}
                 */
                phone: function (phone, settings) {
                    return (/^[0-9+]+/.test(phone));
                },
                /**
                 * Проверка email для оповещения
                 * @param {string} email
                 * @returns {Boolean}
                 */
                email: function (email, settings) {
                    if (email.length > settings.max_email_length)
                        return false;

                    return (/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email));
                },
                /**
                 * Проверка ps_additional_fields
                 * @param {string} ps_additional_field_value
                 * @param {array} settings
                 * @param {string} pattern_str
                 * @param {string} required
                 * @returns {Boolean}
                 */
                ps_additional_field: function (ps_additional_field_value, settings, pattern_str) {
                    var pattern = new RegExp(pattern_str);
                    return (pattern.test(ps_additional_field_value));
                }
            };
    var
            handlers = {
                /**
                 * определение позиции коретки курсора в поле
                 * 
                 * @param {type} node dom объект поля, в которо происходит позиционирование
                 * @param {type} start
                 * @param {type} end
                 * @returns {jquery.card_payment_form_L31.handlers.caret.jquery.card_payment_formAnonym$4}
                 */
                caret: function (node, start, end) {
                    var range;
                    if (start !== undefined) {
                        if (node.setSelectionRange) {
                            node.setSelectionRange(start, end);
                            // IE, "else" for opera 10
                        } else if (document.selection && document.selection.createRange) {
                            range = node.createTextRange();
                            range.collapse(true);
                            range.moveEnd('character', end);
                            range.moveStart('character', start);
                            range.select();
                        }
                    } else {
                        start = 0;
                        end = 0;
                        if ('selectionStart' in node) {
                            start = node.selectionStart;
                            end = node.selectionEnd;
                        } else if (node.createTextRange) {
                            range = document.selection.createRange();
                            var dup = range.duplicate();

                            if (range.parentElement() === node) {
                                start = -dup.moveStart('character', -100000);
                                end = start + range.text.length;
                            }
                        }
                        return {
                            start: start,
                            end: end
                        };
                    }
                },
                // обработчик нескольких полей ввода номера карты       
                card_num_fields: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    this.value = this.value.replace(/[^0-9]/g, "");

                    var cardNum = '';
                    fields.card_num_fields.each(function (i) {
                        cardNum += $(this).val();
                    });

                    if (cardNum.length >= settings.min_card_number_length && cardNum.length <= settings.max_card_number_length)
                        if (validators.card_num(cardNum, settings))
                            ok_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработчик одного поля ввода номера карты
                card_num: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var value = this.value.replace(/[^0-9]/g, "");

                    var panBlocks = value.substr(0, 12).match(/.{1,4}/g) || [];
                    var formattedPan = panBlocks.join(' ');
                    if (value.length > 12) {
                        formattedPan += ' ' + value.substr(12);
                    }
                    this.value = formattedPan;

                    if (value.length >= (settings.min_card_number_length) && value.length <= (settings.max_card_number_length)) {
                        if (validators.card_num(value, settings))
                            ok_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    }
                    else if (value.length > (settings.max_card_number_length)) {
                        error_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    }
                    else
                        nothing_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                /**
                 * обработчик данных при вставке из буфера обмена
                 * для полей даты истечения срока действия карты
                 * 
                 * @param {type} element
                 * @param {type} options
                 * @returns {undefined}
                 */
                after_paste: function (element, options, after_paste_fields, field_lengths) {
                    // for example, inputs value before paste: [00|2 ] [33  ], need paste: 1111
                    // now state: [001111|2] [33  ]

                    var firstValue = element[0].value,
                            caretEnd = handlers.caret(element[0]).end, // in webkit start: 2, end: 6
                            left = firstValue.slice(0, caretEnd), // 001111
                            right = firstValue.slice(caretEnd), // 2
                            rightFreeSpace = options.maxlength - right.length, // 3
                            isSetFocus = false,
                            buffer, newCaretStart, i;

                    for (i = after_paste_fields.length - 1; i > options.index; i--) {
                        rightFreeSpace += field_lengths[i] - after_paste_fields[i].value.length;
                    }

                    if (left.length > rightFreeSpace) {
                        left = left.slice(0, rightFreeSpace); // 001111.slice(0, 5)
                        newCaretStart = rightFreeSpace;
                    } else {
                        newCaretStart = caretEnd;
                    }

                    if (firstValue.length > options.maxlength) {
                        element[0].value = (left + right).slice(0, options.maxlength); // [0011] [33  ]

                        // caret remains on input
                        if (newCaretStart <= options.maxlength) {
                            handlers.caret(element[0], newCaretStart, newCaretStart);
                            isSetFocus = true;
                        }

                        buffer = (left + right).slice(options.maxlength); // 112

                        if (buffer.length) {
                            newCaretStart -= Math.min(options.maxlength, left.length);
                            var maxlength, valLength;
                            while (after_paste_fields[++i]) {
                                maxlength = field_lengths[i];
                                buffer += after_paste_fields[i].value; // 11233

                                after_paste_fields.eq(i)
                                        .val(buffer.slice(0, maxlength))
                                        .change();

                                if (buffer.length <= maxlength) {
                                    break;
                                }

                                valLength = after_paste_fields[i].value.length;

                                if (!isSetFocus) {
                                    if (newCaretStart < maxlength) {
                                        isSetFocus = true;
                                        after_paste_fields.eq(i).focus();
                                        handlers.caret(after_paste_fields[i], newCaretStart, newCaretStart);
                                    }
                                    newCaretStart -= valLength;
                                }
                                buffer = buffer.slice(maxlength);
                            }
                        }
                        if (!isSetFocus) {
                            // setTimeout may be necessary for chrome and safari (https://bugs.webkit.org/show_bug.cgi?id=56271)
                            after_paste_fields.eq(i).focus();
                            handlers.caret(after_paste_fields[i], newCaretStart, newCaretStart);
                        }
                    }
                },
                /**
                 * позиционирование коретки курсора в поле и плавный переход между полями
                 * для полей даты истечения срока действия карты
                 * 
                 * @param {type} e
                 * @returns {undefined}
                 */
                reposition_caret: function (e, reposition_fields, fields_total_lengths, field_lengths) {
                    var eventType = e.type,
                            options = e.data,
                            element = e.data.element,
                            index = e.data.index,
                            caretPos;

                    if (isOpera) { // last check 12
                        if (eventType === 'keypress') {
                            eventType = 'keydown';
                        }
                    }

                    var LEFT_CODE = 37,
                            BACKSPACE_CODE = 8,
                            DELETE_CODE = 46,
                            RIGHT_CODE = 39;

                    if (eventType === 'keydown' && e.keyCode === RIGHT_CODE) {
                        caretPos = handlers.caret(element[0]);
                        if (
                                caretPos.start === this.value.length && // caret is last
                                index !== reposition_fields.length - 1 // input is no last
                                ) {
                            reposition_fields.eq(index + 1).focus();
                            handlers.caret(reposition_fields[index + 1], 0, 0);
                            e.preventDefault(); // no next motion
                        }
                    }
                    if (eventType === 'keydown' && (e.keyCode === BACKSPACE_CODE || e.keyCode === LEFT_CODE)) {
                        caretPos = handlers.caret(element[0]);
                        if (
                                caretPos.start === caretPos.end &&
                                caretPos.start === 0 && // caret is first
                                index !== 0 // input is no first
                                ) {
                            var toFocus = reposition_fields.eq(index - 1),
                                    lengthToFocus = toFocus.val().length;
                            toFocus.focus();
                            handlers.caret(toFocus[0], lengthToFocus, lengthToFocus);
                            if (e.keyCode === LEFT_CODE) {
                                e.preventDefault(); // no next motion
                            }
                        }
                    }
                    if (eventType === 'keyup' ||
                            eventType === 'keydown') { // repeat in FF10, Webkit, IE
                        //case 'keypress': // repeat in FF10, Opera 11
                        // ignore system key. ex. shift
                        if (e.keyCode < 48) {
                            return;
                        }

                        // ignore ctrl + any key
                        if (eventType === 'keyup' && options.ignoreNextKeyup) {
                            options.ignoreNextKeyup = false;
                            return;
                        }
                        if (e.metaKey) {
                            // metaKey is ignored in browsers on keyup
                            options.ignoreNextKeyup = true;
                            return;
                        }

                        caretPos = handlers.caret(element[0]);
                        if (
                                caretPos.start === caretPos.end &&
                                caretPos.start === this.value.length && // caret is last
                                index !== reposition_fields.length - 1 && // input is no last
                                this.value.length === options.maxlength
                                ) {
                            reposition_fields.eq(index + 1).focus();
                            handlers.caret(reposition_fields[index + 1], 0, 0);
                        }
                    }
                    if (eventType === 'paste') {
                        element.attr(MAXLENGTH_ATTRIBUTE, fields_total_lengths);
                    }
                    /*            case 'keypress':
                     element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength + 1);
                     break;*/
                    if (eventType === 'propertychange' || // IE8
                            eventType === 'input') { // webkit set cursor position as [00|11112]
                        // after paste
                        if (element.attr(MAXLENGTH_ATTRIBUTE) !== options.maxlength) {
                            // Chrome fix
                            setTimeout(function () {
                                handlers.after_paste(element, options, reposition_fields, field_lengths);
                                element.attr(MAXLENGTH_ATTRIBUTE, options.maxlength);
                            }, 0);
                        }
                    }
                    if (eventType === 'input' && isOpera) {
                        handlers.after_paste(element, options, reposition_fields, field_lengths);
                    }
                },
                // обработка двух полей ввода даты истечения карты
                exp_date_fields: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    if (fields.exp_date_type === 'input') {
                        this.value = this.value.replace(/[^0-9]/g, "");
                    }

                    var expireDate = '';
                    fields.exp_date_fields.each(function (i) {
                        var value = $(this).val();
                        var s = value.length - 2;
                        expireDate += (expireDate === '' ? value : '/' + value.substring(s, s + 2));
                    });

                    if (expireDate.length >= 5)
                        if (validators.exp_date(expireDate, settings))
                            ok_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка одного поля ввода даты истечения карты
                exp_date: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var value = this.value = this.value.replace(/[^0-9 /-]/g, "");
                    value = value.replace("-", "/");
                    if (value.length >= 5)
                        if (validators.exp_date(value, settings))
                            ok_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка имени на карте
                name_on_card: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var value = this.value = this.value.replace(/[^A-Za-z -]/g, "");

                    if (value.length >= settings.min_name_on_card_length && value.length <= settings.max_name_on_card_length)
                        if (validators.name_on_card(value, settings))
                            ok_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка cvc
                card_cvc: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var value = this.value = this.value.replace(/\D/g, "");

                    if (value.length >= settings.min_card_cvc_length && value.length <= settings.max_card_cvc_length)
                        if (validators.card_cvc(value, settings))
                            ok_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка номера телефона
                phone: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var BACKSPACE_CODE = 8;
                    var value = this.value = this.value.replace(/[^0-9+()]/g, "");

                    // Вставка скобки и страны
                    if (this.value === "" && e.keyCode !== BACKSPACE_CODE)
                        this.value = "+" + settings.default_code_country + "(";

                    // Закрытие скобкой кода
                    if (this.value[this.value.length - settings.default_code_country_lenght - 1] === "(" && e.keyCode !== BACKSPACE_CODE)
                        this.value = this.value + ")";


                    if (value.length >= settings.min_phone_length && value.length <= settings.max_phone_length)
                        if (validators.phone(value, settings))
                            ok_setter.phone.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                        else
                            error_setter.phone.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        nothing_setter.phone.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка email для оповещения
                email: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var value = this.value;

                    if (!value.length)
                        nothing_setter.email.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else if (validators.email(value, settings))
                        ok_setter.email.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        error_setter.email.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                },
                // обработка дополнительного для ПС поля. в валидотор дополнительно передается регулярное выражение
                ps_additional_field: function (e, fields, validators, settings, ok_setter, error_setter, nothing_setter) {
                    var pattern = this.pattern;
                    var value = this.value;

                    if (!value.length)
                        nothing_setter.ps_additional_field.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else if (validators.ps_additional_field(value, settings, pattern))
                        ok_setter.ps_additional_field.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    else
                        error_setter.ps_additional_field.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                }
            };

    /*
     * Обработка ответов от бекэнда
     */
    var repliers = {
        ok: function (reply) {
            if (reply.message) {
                var data = plugin_init_data;

                data['info_form'].addClass("field_ok").removeClass("field_error");
                plugin_init_data[PLUGIN_NAME].fields.message.text(reply.message);
                forms.show_form.apply(this, [ID_INFO_FORM]);
            }
            return this;
        },
        submit: function (reply) {
            $('form', this).unbind('.' + PLUGIN_NAME)
                    .attr({
                        'action': reply.handler,
                        'method': 'POST'
                    })
                    .submit();
            return this;
        },
        reload: function (reply) {
            location.reload();
            return this;
        },
        show_form: function (reply) {
            if (reply.object)
                forms.show_form.apply(this, [reply.object]);

            return this;
        },
        error: function (reply) {
            if (reply.message) {
                var data = plugin_init_data;
                data['info_form'].addClass("field_error").removeClass("field_ok");
                plugin_init_data[PLUGIN_NAME].fields.message.text(reply.message);
                forms.show_form.apply(this, [ID_INFO_FORM]);
            }
            return this;
        },
        error_in_fields: function (reply) {
            if (reply.fields) {
                forms.handle_card_data_errors.apply(this, [reply.fields]);
                forms.handle_simple_form_data_errors.apply(this, [reply.fields]);
            }
            return this;
        },
        redirect: function (reply) {
            window.location.replace(reply.url);
        },
        wait: function (reply) {
        }
    };

    /*
     * Работа со всей формой. Отображение, скрытие и т.д.
     */
    var forms = {
        form_state: {
            form_fader: {
                displayed: false,
                deep: 0
            }
        },
        show_function: {},
        hide_function: {},
        reposition_function: {
            form_fader: function () {
                return this.each(function () {
                    var data = plugin_init_data;

                    var
                            docW = $(document).width(),
                            docH = $(document).height();

                    data['form_fader']
                            .css({
                                'width': docW,
                                'height': docH
                            });
                });
            }
        },
        show_fader: function () {
            if (forms.form_state.form_fader.displayed !== true) {
                var
                        data = plugin_init_data;
                data['form_fader'].fadeIn("fast");
                forms.form_state.form_fader.displayed = true;
            }
            forms.form_state.form_fader.deep++;
        },
        hide_fader: function () {
            forms.form_state.form_fader.deep--;
            if (forms.form_state.form_fader.displayed !== false
                    && forms.form_state.form_fader.deep === 0) {

                var data = plugin_init_data;
                data['form_fader'].fadeOut("fast");
                forms.form_state.form_fader.displayed = false;
            }
        },
        reposition: function () {
            for (var n in forms.reposition_function)
                if (forms.reposition_function[n] && typeof forms.reposition_function[n] === "function")
                    forms.reposition_function[n].apply(this);
        },
        show_form: function (form_name) {

            var nDeep = 0;

            // Сдесь надо проверить открыта ли форма, если да, то спрятать и проставить диип
            if (forms.form_state.form_fader.displayed === true)
                for (var n in forms.form_state) {
                    if (forms.form_state[n].displayed === true && n === form_name)
                        return;
                    if (forms.form_state[n].displayed === true && n !== 'form_fader') {
                        forms.hide_function[n].apply(this);
                        nDeep = forms.form_state[n].deep;
                    }
                }

            nDeep++;
            forms.show_fader.apply(this);
            if (forms.show_function[form_name] && typeof forms.show_function[form_name] === "function")
                forms.show_function[form_name].apply(this);

            if (forms.form_state[form_name]) {
                forms.form_state[form_name].displayed = true;
                forms.form_state[form_name].deep = nDeep;
            }
            else
                forms.form_state[form_name] = {
                    displayed: true,
                    deep: nDeep
                };
        },
        hide_form: function (form_name) {
            // ищем форму с предыдущим deep и открываем её
            if (forms.hide_function[form_name] && typeof forms.hide_function[form_name] === "function")
                forms.hide_function[form_name].apply(this);
            forms.hide_fader.apply(this);

            var nDeep = forms.form_state[form_name].deep - 1;
            if (forms.form_state[form_name]) {
                forms.form_state[form_name].displayed = false;
                forms.form_state[form_name].deep = 0;
            }

            if (forms.form_state.form_fader.displayed === true) {
                for (var n in forms.form_state)
                    if (forms.form_state[n].displayed === true && nDeep === forms.form_state[n].deep && n !== 'form_fader')
                        forms.show_function[n].apply(this);
            }
            else
                for (var n in forms.form_state)
                    if (forms.form_state[n].displayed === true && n !== 'form_fader') {
                        forms.form_state[n].displayed = false;
                        forms.form_state[n].deep = 0;
                    }
        },
        get_card_data: function (step) {
            var arr = {},
                    fields = plugin_init_data[PLUGIN_NAME].fields;

            if (step === ID_CARD_INPUT_FORM) {
                arr.name_on_card = fields.name_on_card.val();
                arr.card_cvc = fields.card_cvc.val();

                if (typeof fields.card_num !== 'undefined') {
                    arr.card_num = fields.card_num.val();
                }
                else if (typeof fields.card_num_fields !== 'undefined') {
                    fields.card_num_fields.each(function (i) {
                        var element = $(this);
                        arr[element.attr('name')] = element.val();
                    });
                }

                if (typeof fields.exp_date !== 'undefined') {
                    arr.exp_date = fields.exp_date.val();
                }
                else if (typeof fields.exp_date_fields !== 'undefined') {
                    fields.exp_date_fields.each(function (i) {
                        var element = $(this);
                        arr[element.attr('name')] = element.val();
                    });
                }
            }

            arr.customer = customer;
            if (typeof key !== 'undefined')
                arr.key = key;

            return arr;
        },
        /*
         * Получить данные с формы, которые не относятся к банковским и к дополнительным полям ПС
         */
        get_simple_data: function () {
            var arr = {},
                    fields = plugin_init_data[PLUGIN_NAME].fields;

            if (typeof fields.phone !== 'undefined') {
                arr.phone = fields.phone.val();
            }

            if (fields.email.val() !== 'undefined')
                arr.email = fields.email.val();

            var ps_additional_fields = methods.get_ps_additional_fields_by_ps_name(methods.get_current_ps_name());
            if (!$.isEmptyObject(ps_additional_fields)) {
                arr.ps_additional_fields = {};
                ps_additional_fields.each(function () {
                    var element = $(this);

                    var name = element.attr('name');
                    var pattern = element.attr('pattern');
                    var required = element.attr('data-is-required');

                    arr.ps_additional_fields[name] = {
                        'value': element.val(),
                        'pattern': pattern,
                        'required': required,
                        'element': element
                    };
                });
            }

            return arr;
        },
        handle_card_data_errors: function (arr_fields) {
            var data = plugin_init_data[PLUGIN_NAME],
                    fields = plugin_init_data[PLUGIN_NAME].fields;

            if (arr_fields.form)
                error_setter.form.apply(this, [data, arr_fields.form, forms, fields, validators, settings, ok_setter, error_setter, nothing_setter]);

            if (arr_fields.card_num) {
                if (typeof fields.card_num !== 'undefined')
                    error_setter.card_num.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                else if (typeof fields.card_num_fields !== 'undefined')
                    error_setter.card_num_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
            }

            if (arr_fields.card_cvc)
                error_setter.card_cvc.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);

            if (arr_fields.exp_date) {
                if (typeof fields.exp_date !== 'undefined')
                    error_setter.exp_date.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                else if (typeof fields.exp_date_fields !== 'undefined')
                    error_setter.exp_date_fields.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
            }

            if (arr_fields.name_on_card)
                error_setter.name_on_card.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
        },
        handle_simple_form_data_errors: function (arr_fields) {
            var fields = plugin_init_data[PLUGIN_NAME].fields;
            if (arr_fields[NAME_INPUT_FORM_PHONE_FIELD])
                error_setter.phone.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);

            if (arr_fields[NAME_INPUT_FORM_EMAIL_FIELD])
                error_setter.email.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);

            if (arr_fields.ps_additional_fields) {
                for (var object in arr_fields.ps_additional_fields) {
                    methods.get_ps_additional_fields_by_ps_name(methods.get_current_ps_name()).each(function () {
                        if ($(this).attr('name') === object)
                            error_setter.ps_additional_field.apply(this, [fields, validators, settings, ok_setter, error_setter, nothing_setter]);
                    });
                }
            }
        }
    };

    var methods = {
        /*
         * Метод по умолчанию при инициализации плагина
         * @param {type} override_options
         * @returns {jquery.payment_form_L31.methods}
         */
        init: function (override_options) {
            methods.init_plugin_settings.apply(this, [override_options]);

            var $form = $(this);
            fields = Object.create(default_fields);

            //
            // Если плагин ещё не проинициализирован для этой формы
            //
            if ($.isEmptyObject(plugin_init_data[PLUGIN_NAME])) {
                var urlParams = [];

                (function () {
                    var e,
                            a = /\+/g, // Regex for replacing addition symbol with a space
                            r = /([^&=]+)=?([^&]*)/g,
                            d = function (s) {
                                return decodeURIComponent(s.replace(a, " "));
                            },
                            q = window.location.search.substring(1);

                    while (e = r.exec(q))
                        urlParams[d(e[1])] = d(e[2]);
                })();

                customer = urlParams['customer'];
                key = urlParams['key'];

                if (settings.form_type === 'card_form') {
                    methods.init_card_field_lenghts.apply($form);
                    methods.init_card_input_form.apply($form);
                    methods.init_simple_input_form.apply($form);
                    methods.init_submit_button.apply($form, [settings.form_type]);
                }
                else if (settings.form_type === 'simple_form') {
                    methods.init_simple_input_form.apply($form);
                    methods.init_submit_button.apply($form, [settings.form_type]);
                }
                else if (settings.form_type === 'loader_form') {
                    methods.init_loader_form.apply($form);
                }

                if ($.isEmptyObject(plugin_init_data)) {
                    $form_fader = methods.init_form_fader.apply($form);
                    $info_form = methods.init_info_form.apply($form, [$form_fader]);

                    if (settings.form_type === 'simple_form' || settings.form_type === 'card_form')
                        methods.init_common_payment_page();

                    plugin_init_data = {
                        'loader_form': $form,
                        'form_fader': $form_fader,
                        'info_form': $info_form
                    };
                }

                plugin_init_data[PLUGIN_NAME] = {
                    'fields': fields,
                    'settings': settings,
                    'input_form': $form
                };

                //
                // Прикрепляем реакцию на смену размеров окна
                //
                $(window).bind('resize.' + PLUGIN_NAME, function (e) {
                    e.preventDefault();
                    forms.reposition.apply($form);
                });

            }

            return this;
        },
        /*
         * Совмещаем настройки
         */
        init_plugin_settings: function (override_options) {
            PLUGIN_NAME = $(this).attr('data-id');

            settings = $.extend(default_settings, override_options, methods.get_accepted_card_brands.apply(this));
            if (!init_common) {
                if (Object.keys(settings.ok_setter).length > 0)
                    for (var strFunctionName in settings.ok_setter)
                        if (typeof settings.ok_setter[strFunctionName] === 'function' && typeof ok_setter[strFunctionName] === 'function')
                            ok_setter[strFunctionName] = settings.ok_setter[strFunctionName];
                if (Object.keys(settings.error_setter).length > 0)
                    for (var strFunctionName in settings.error_setter)
                        if (typeof settings.error_setter[strFunctionName] === 'function' && typeof error_setter[strFunctionName] === 'function')
                            error_setter[strFunctionName] = settings.error_setter[strFunctionName];
                if (Object.keys(settings.nothing_setter).length > 0)
                    for (var strFunctionName in settings.nothing_setter)
                        if (typeof settings.nothing_setter[strFunctionName] === 'function' && typeof nothing_setter[strFunctionName] === 'function')
                            nothing_setter[strFunctionName] = settings.nothing_setter[strFunctionName];
                if (Object.keys(settings.validators).length > 0)
                    for (var strFunctionName in settings.validators)
                        if (typeof settings.validators[strFunctionName] === 'function' && typeof validators[strFunctionName] === 'function')
                            validators[strFunctionName] = settings.validators[strFunctionName];
                if (Object.keys(settings.handlers).length > 0)
                    for (var strFunctionName in settings.handlers)
                        if (typeof settings.handlers[strFunctionName] === 'function' && typeof handlers[strFunctionName] === 'function')
                            handlers[strFunctionName] = settings.handlers[strFunctionName];
                if (Object.keys(settings.repliers).length > 0)
                    for (var strFunctionName in settings.repliers)
                        if (typeof settings.repliers[strFunctionName] === 'function' && typeof repliers[strFunctionName] === 'function')
                            repliers[strFunctionName] = settings.repliers[strFunctionName];
            }
            init_common = true;
        },
        /*
         * Инициализация допустимых длин полей
         */
        get_accepted_card_brands: function () {
            if ($(this).find('span.accepted_card_brands')) {
                return {'accepted_card_brands': $(this).find('input#accepted_card_brands').val()};
            }
            else
                return {};
        },
        /*
         * Инициализация допустимых длин полей
         */
        init_card_field_lenghts: function () {
            if (typeof settings.min_card_number_length === 'undefined' || typeof settings.max_card_number_length === 'undefined') {
                var min_card_number_length = undefined, max_card_number_length = undefined;
                // Разделяем, т.к. в html хранится в виде строки
                settings.accepted_card_brands = settings.accepted_card_brands.split(',');
                for (var n in settings.accepted_card_brands) {
                    if (settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'VISA' ||
                            settings.accepted_card_brands[n] === 'VISA ELECTRON' || settings.accepted_card_brands[n] === 'DISCOVER'
                            || settings.accepted_card_brands[n] === 'JCB') {
                        min_card_number_length = min_card_number_length > 16 || typeof min_card_number_length == 'undefined' ? 16 : min_card_number_length;
                        max_card_number_length = max_card_number_length < 16 || typeof max_card_number_length == 'undefined' ? 16 : max_card_number_length;
                    }
                    else if (settings.accepted_card_brands[n] === 'MAESTRO' || settings.accepted_card_brands[n] === 'CHINA UNION PAY' || settings.accepted_card_brands[n] === 'MIR') {
                        min_card_number_length = min_card_number_length > 16 || typeof min_card_number_length == 'undefined' ? 16 : min_card_number_length;
                        max_card_number_length = max_card_number_length < 19 || typeof max_card_number_length == 'undefined' ? 19 : max_card_number_length;
                    }
                    else if (settings.accepted_card_brands[n] === 'AMERICAN EXPRESS') {
                        min_card_number_length = min_card_number_length > 15 || typeof min_card_number_length == 'undefined' ? 15 : min_card_number_length;
                        max_card_number_length = max_card_number_length < 15 || typeof max_card_number_length == 'undefined' ? 15 : max_card_number_length;
                    }
                    else if (settings.accepted_card_brands[n] === 'DINERS CLUB' || settings.accepted_card_brands[n] === 'PRO100') {
                        min_card_number_length = min_card_number_length > 14 || typeof min_card_number_length == 'undefined' ? 14 : min_card_number_length;
                        max_card_number_length = max_card_number_length < 14 || typeof max_card_number_length == 'undefined' ? 14 : max_card_number_length;
                    }
                }

                settings.min_card_number_length = min_card_number_length;
                settings.max_card_number_length = max_card_number_length;
            }
            if (typeof settings.min_card_cvc_length === 'undefined' || typeof settings.max_card_cvc_length === 'undefined') {
                var min_card_cvc_length = undefined, max_card_cvc_length = undefined;
                for (var n in settings.accepted_card_brands) {
                    if (settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'MAESTRO' ||
                            settings.accepted_card_brands[n] === 'VISA' || settings.accepted_card_brands[n] === 'VISA ELECTRON' ||
                            settings.accepted_card_brands[n] === 'DINERS CLUB' || settings.accepted_card_brands[n] === 'DISCOVER'
                            || settings.accepted_card_brands[n] === 'JCB' || settings.accepted_card_brands[n] === 'CHINA UNION PAY' 
                            || settings.accepted_card_brands[n] === 'MIR' || settings.accepted_card_brands[n] === 'PRO100') {
                        min_card_cvc_length = min_card_cvc_length > 3 || typeof min_card_cvc_length == 'undefined' ? 3 : min_card_cvc_length;
                        max_card_cvc_length = max_card_cvc_length < 3 || typeof max_card_cvc_length == 'undefined' ? 3 : max_card_cvc_length;
                    }
                    else if (settings.accepted_card_brands[n] === 'AMERICAN EXPRESS') {
                        min_card_cvc_length = min_card_cvc_length > 4 || typeof min_card_cvc_length == 'undefined' ? 4 : min_card_cvc_length;
                        max_card_cvc_length = max_card_cvc_length < 4 || typeof max_card_cvc_length == 'undefined' ? 4 : max_card_cvc_length;
                    }
                }
                settings.min_card_cvc_length = min_card_cvc_length;
                settings.max_card_cvc_length = max_card_cvc_length;
            }
            if (typeof settings.min_name_on_card_length === 'undefined' || typeof settings.max_name_on_card_length === 'undefined') {
                var min_name_on_card_length = undefined, max_name_on_card_length = undefined;
                for (var n in settings.accepted_card_brands) {
                    if (settings.accepted_card_brands[n] === 'MASTERCARD' || settings.accepted_card_brands[n] === 'MAESTRO' ||
                            settings.accepted_card_brands[n] === 'VISA' || settings.accepted_card_brands[n] === 'VISA ELECTRON' ||
                            settings.accepted_card_brands[n] === 'DINERS CLUB' || settings.accepted_card_brands[n] === 'DISCOVER'
                            || settings.accepted_card_brands[n] === 'JCB' || settings.accepted_card_brands[n] === 'CHINA UNION PAY'
                            || settings.accepted_card_brands[n] === 'MIR' || settings.accepted_card_brands[n] === 'PRO100') {
                        min_name_on_card_length = min_name_on_card_length > 3 || typeof min_name_on_card_length == 'undefined' ? 3 : min_name_on_card_length;
                        max_name_on_card_length = max_name_on_card_length < 27 || typeof max_name_on_card_length == 'undefined' ? 27 : max_name_on_card_length;
                    }
                    else if (settings.accepted_card_brands[n] === 'AMERICAN EXPRESS') {
                        min_name_on_card_length = min_name_on_card_length > 4 || typeof min_name_on_card_length == 'undefined' ? 4 : min_name_on_card_length;
                        max_name_on_card_length = max_name_on_card_length < 27 || typeof max_name_on_card_length == 'undefined' ? 27 : max_name_on_card_length;
                    }
                }
                settings.min_name_on_card_length = min_name_on_card_length;
                settings.max_name_on_card_length = max_name_on_card_length;
            }
        },
        /*
         * Инициализация фейдера, затемняющего "задний" экран
         * @returns {jQuery|$}
         */
        init_form_fader: function () {
            var form_fader = $('<div></div>')
                    .attr({
                        'id': ID_FORM_FADER,
                        'class': ID_FORM_FADER
                    });
            $(document.body)
                    .append(form_fader);

            return $('#' + ID_FORM_FADER);
        },
        /*
         * Определение событий на полях, не относящихся к банковской карте
         * @returns {jquery.payment_form_L31.methods}
         */
        init_simple_input_form: function () {
            var $input_form = this;
            fields.phone = $("input[name^=" + NAME_INPUT_FORM_PHONE_FIELD + "]", $input_form);

            if (fields.phone.length === 1) {

                fields.phone
                        .on('keyup focus',
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.phone.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поля для ввода номера телефона');

            fields.email = $("input[name=" + NAME_INPUT_FORM_EMAIL_FIELD + "]", $input_form);
            if (fields.email.length === 1) {
                fields.email
                        .attr({
                            'maxlength': settings.max_email_length
                        })
                        .focusout(
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.email.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поле для email оповещений');

            fields.ps_additional_fields = $(".js_ps_additional_field input", $input_form);
            if (fields.ps_additional_fields.length) {
                fields.ps_additional_fields.each(function () {
                    $(this).focusout(
                            function (e) {
                                e.preventDefault();
                                methods.set_plugin_name.apply(this);

                                handlers.ps_additional_field.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                            }
                    );
                });
            }

            return $input_form;
        },
        /*
         * Загрузка формы ввода банковской карты
         * @returns {jQuery|$}
         */
        init_card_input_form: function () {
            var $card_input_form = $(this);
            /*
             * Определение набора полей и привяска реакции на события 
             */
            fields.card_num = fields.card_num_fields = $("input[name^=" + NAME_CARD_INPUT_FORM_CARD_NUM_FIELD + "]", $card_input_form);
            if (fields.card_num_fields.length === 1) {
                fields.card_num_fields = undefined;

                fields.card_num
                        .attr({
                            'autocomplete': 'off'
                        })
                        .keyup(
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.card_num.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
            }
            else if (fields.card_num_fields.length > 1) {
                fields.card_num = undefined;

                fields.card_num_fields.each(function (i) {
                    var element = $(this),
                            maxlength = +element.attr(MAXLENGTH_ATTRIBUTE);

                    fields.card_num_fields_total_lengths += maxlength;
                    fields.card_num_field_lengths.push(maxlength);

                    element
                            .attr({
                                'autocomplete': 'off'
                            })
                            .on('keydown keypress keyup input paste propertychange', {
                                element: element,
                                index: i,
                                maxlength: maxlength
                            }, function (e) {
                                methods.set_plugin_name.apply(this);
                                handlers.reposition_caret.apply(this,
                                        [e,
                                            plugin_init_data[PLUGIN_NAME].fields.card_num_fields,
                                            plugin_init_data[PLUGIN_NAME].fields.card_num_fields_total_lengths,
                                            plugin_init_data[PLUGIN_NAME].fields.card_num_field_lengths]
                                        );
                            })
                            .keyup(function (e) {
                                e.preventDefault();
                                methods.set_plugin_name.apply(this);
                                handlers.card_num_fields.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                            }
                            );
                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поля для ввода номера банковской карты');

            var
                    $expireDateInputs = $("input[name=" + NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD + "], input[name=" + NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD + "]", $card_input_form),
                    $expireDateSelectors = $("select[name=" + NAME_CARD_INPUT_FORM_EXP_MONTH_FIELD + "], select[name=" + NAME_CARD_INPUT_FORM_EXP_YEAR_FIELD + "]", $card_input_form);

            fields.exp_date = $("input[name=" + NAME_CARD_INPUT_FORM_EXP_DATE_FIELD + "]", $card_input_form);
            if (fields.exp_date.length === 1) {
                fields.exp_date_fields = undefined;
                fields.exp_date
                        .attr({
                            'autocomplete': 'off'
                        })
                        .keyup(
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.exp_date.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
                fields.exp_date_type = 'input';
            }
            else if ($expireDateInputs.length === 2) {
                fields.exp_date = undefined;
                fields.exp_date_fields = $expireDateInputs;
                fields.exp_date_type = 'input';
                fields.exp_date_fields.each(function (i) {
                    var element = $(this),
                            maxlength = +element.attr(MAXLENGTH_ATTRIBUTE);

                    fields.exp_date_fields_total_lengths += maxlength;
                    fields.exp_date_field_lengths.push(maxlength);

                    element
                            .attr({
                                'autocomplete': 'off'
                            })
                            .on('keydown keypress keyup input paste propertychange', {
                                element: element,
                                index: i,
                                maxlength: maxlength
                            }, function (e) {
                                methods.set_plugin_name.apply(this);
                                handlers.reposition_caret.apply(this,
                                        [e,
                                            plugin_init_data[PLUGIN_NAME].fields.exp_date_fields,
                                            plugin_init_data[PLUGIN_NAME].fields.exp_date_fields_total_lengths,
                                            plugin_init_data[PLUGIN_NAME].fields.exp_date_field_lengths]
                                        );
                            })
                            .keyup(function (e) {
                                e.preventDefault();
                                methods.set_plugin_name.apply(this);
                                handlers.exp_date_fields.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                            }
                            );
                });
            }
            else if ($expireDateSelectors.length === 2) {
                fields.exp_date = undefined;
                fields.exp_date_fields = $expireDateSelectors;
                fields.exp_date_type = 'select';
                fields.exp_date_fields.each(function (i) {
                    var element = $(this);

                    element
                            .change(function (e) {
                                e.preventDefault();
                                methods.set_plugin_name.apply(this);
                                handlers.exp_date_fields.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                            }
                            );
                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поля для даты истечения банковской карты');

            fields.name_on_card = $("input[name=" + NAME_CARD_INPUT_FORM_NAME_ON_CARD_FIELD + "]", $card_input_form);
            if (fields.name_on_card.length === 1) {
                fields.name_on_card
                        .on('change keyup',
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.name_on_card.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поля для имени владельца карты');

            fields.card_cvc = $("input[name=" + NAME_CARD_INPUT_FORM_CARD_CVC_FIELD + "]", $card_input_form);
            if (fields.card_cvc.length === 1) {
                fields.card_cvc
                        .attr({
                            'maxlength': settings.max_card_cvc_length,
                            'autocomplete': 'off'
                        })
                        .keyup(
                                function (e) {
                                    e.preventDefault();
                                    methods.set_plugin_name.apply(this);
                                    handlers.card_cvc.apply(this, [e, plugin_init_data[PLUGIN_NAME].fields, validators, plugin_init_data[PLUGIN_NAME].settings, ok_setter, error_setter, nothing_setter]);
                                });
            }
            else
                console.log('Невозможно инициализировать форму, не удается определить поля для cvc карты');

            return $card_input_form;
        },
        /*
         * Вешаем обработчик на кнопку оплаты
         * @returns {boolen|undefined}
         */
        init_submit_button: function (form_type) {
            var $input_form = $(this);

            $('form', $input_form)
                    .bind('submit.' + PLUGIN_NAME, function (e) {
                        e.preventDefault();
                        if (form_type === 'card_form')
                            methods.check_card_data.apply($input_form);
                        else if (form_type === 'simple_form')
                            methods.check_simple_data.apply($input_form);

                        return false;
                    });
        },
        /*
         * Загрузка формы лоадера. актуальна для возврата с платежной системы. во всех остальных случаях человек должен ждать на state_url
         * @returns {jQuery|$}
         */
        init_loader_form: function () {
            var $loader_form = $(this);
            $("#" + ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION, $loader_form).hide();
            tick.set(true);

            (function tickFunction()
            {
                if (tick.get())
                    methods.get_action.apply($loader_form);

                setTimeout(tickFunction, LOADER_REFERSH_ACTION_TIMEOUT * 1000);
            })();

            setTimeout(
                    function showHoldTransactionInformation() {
                        tick.set(false);
                        $("#" + ID_LOADER_FORM_INFO_BY_IDLE_TRANSACTION, $loader_form).hide();
                        $("#" + ID_LOADER_FORM_INFO_BY_HOLD_TRANSACTION, $loader_form).show();
                    }
            , LOADER_SHOTDOWN_TIMEOUT * 1000);

            return $loader_form;
        },
        /*
         * Загрузка инфо странички, например, для отображения реакции отказа по фрод мониторингу
         * @returns {jQuery|$}
         */
        init_info_form: function (form_fader) {
            methods.set_plugin_name.apply(this);

            var $card_input_form = $(this),
                    // ---
                    info_message_row = $('<div></div>')
                    .attr({
                        'name': NAME_INFO_FORM_MESSAGE_FIELD,
                        'class': NAME_INFO_FORM_MESSAGE_FIELD
                    }),
                    info_ok_button = $('<button></button>')
                    .attr({'class': "ok_button"})
                    .text("Ok")
                    .bind('click.' + PLUGIN_NAME, function (e) {
                        e.preventDefault();
                        forms.hide_fader.apply($card_input_form, [ID_INFO_FORM]);
                    }),
                    info_button_row = $('<div></div>').append(info_ok_button),
                    info_form_container = $('<div></div>')
                    .attr('id', ID_INFO_FORM)
                    .attr('class', ID_INFO_FORM)
                    .append(info_message_row)
                    .append(info_button_row);
            // ---
            $(form_fader)
                    .append(info_form_container);

            var
                    $info_form = $('#' + ID_INFO_FORM),
                    $info_form_message_field = $('.message', $info_form);

            fields.message = $info_form_message_field;
            forms.show_function.info_form = function () {

                var data = plugin_init_data;

                forms.reposition.apply($card_input_form);
                data['info_form'].fadeIn("fast");
                //$('#mask').fadeTo("slow",0.8);
                return this;
            };
            forms.hide_function.info_form = function () {

                var data = plugin_init_data;

                data['info_form'].fadeOut("fast", function () {
                    fields.message.text('');
                    $(this).removeClass("field_ok").removeClass("field_error");
                });
                return this;
            };
            forms.reposition_function.info_form = function () {

                var data = plugin_init_data;

                var winH = $(window).height(),
                        winW = $(window).width();

                data['info_form']
                        .css({
                            'top': winH / 2 - data['info_form'].height() / 2,
                            'left': winW / 2 - data['info_form'].width() / 2
                        });
                return this;
            };

            return $info_form;
        },
        /*
         * Удалить плагин и отвязать от формы
         */
        destroy: function () {
            return this.each(function () {
                $(window).unbind(PLUGIN_NAME);
                $(window).removeData(PLUGIN_NAME);
            });
        },
        /*
         * Получение ответа от бекэнда на действие с формой и вызов этого действия
         */
        get_action: function () {
            return this.each(function () {
                var
                        $loader_form = $(this);
                arrLoaderFromParams = {};
                arrLoaderFromParams.customer = customer;

                $.postJSON(
                        cb_urls.action_url,
                        arrLoaderFromParams,
                        function (data, textStatus) {
                            if ('success' != textStatus) {
                                methods.display_error('can not request action');
                                return;
                            }
                            repliers[data.action].apply($loader_form, [data]);
                        }
                );
            });
        },
        /*
         * Проверяет всю форму банковской карты на фронтэнде. Если все хорошо - отправляет на бекэнд
         */
        check_card_data: function () {
            methods.set_plugin_name.apply(this);
            return this.each(function () {

                var
                        $card_input_form = $(this),
                        arrCardFormParams = forms.get_card_data.apply($card_input_form, [ID_CARD_INPUT_FORM]),
                        arrCardFormErrors = validators.check_card_data(arrCardFormParams, plugin_init_data[PLUGIN_NAME].settings),
                        arrNotCardFormParams = forms.get_simple_data.apply($card_input_form),
                        arrNotCardFormErrors = validators.check_simple_data(arrNotCardFormParams, plugin_init_data[PLUGIN_NAME].settings);

                forms.handle_card_data_errors.apply($card_input_form, [arrCardFormErrors]);
                forms.handle_simple_form_data_errors.apply($card_input_form, [arrNotCardFormErrors]);

                if (Object.keys(arrCardFormErrors).length > 0 || Object.keys(arrNotCardFormErrors).length > 0)
                    return;

                arrMergeParams = $.extend(arrCardFormParams, arrNotCardFormParams);
                arrMergeParams.ps_name = methods.get_current_ps_name();
                arrMergeParams.customer = customer;

                // Посылаем на бекэнд дополнительные ланные ПС в сгруппированном виде
                if (arrNotCardFormParams.ps_additional_fields) {
                    $.each(arrNotCardFormParams.ps_additional_fields, function (name, value) {
                        arrMergeParams.ps_additional_fields[name] = value.value;
                    });
                }

                $.postJSON(
                        cb_urls.check_card_data_url,
                        arrMergeParams,
                        function (data, textStatus) {
                            if ('success' != textStatus) {
                                methods.display_error('can not check card data');
                                return;
                            }
                            repliers[data.action].apply($card_input_form, [data]);
                        }
                );
            });
      },
        /*
         * Проверка не банковских данных
         */
        check_simple_data: function () {
            methods.set_plugin_name.apply(this);
            return this.each(function () {
                var
                        $input_form = $(this),
                        arrNotCardFormParams = forms.get_simple_data.apply($input_form),
                        arrNotCardFormErrors = validators.check_simple_data(arrNotCardFormParams, plugin_init_data[PLUGIN_NAME].settings);

                forms.handle_simple_form_data_errors.apply($input_form, [arrNotCardFormErrors]);

                if (Object.keys(arrNotCardFormErrors).length > 0)
                    return;

                arrNotCardFormParams.ps_name = methods.get_current_ps_name();
                arrNotCardFormParams.customer = customer;

                // Посылаем на бекэнд дополнительные ланные ПС в сгруппированном виде
                if (arrNotCardFormParams.ps_additional_fields) {
                    $.each(arrNotCardFormParams.ps_additional_fields, function (name, value) {
                        arrNotCardFormParams.ps_additional_fields[name] = value.value;
                    });
                }

                $.postJSON(
                        cb_urls.check_simple_data_url,
                        arrNotCardFormParams,
                        function (data, textStatus) {
                            if ('success' != textStatus) {
                                methods.display_error('can not check card data');
                                return;
                            }
                            repliers[data.action].apply($input_form, [data]);
                        }
                );
            });
        },
        /*
         * Устанавливаем название плагина, чтобы работа шла с текущей формой
         * @returns {undefined}
         */
        set_plugin_name: function () {
            PLUGIN_NAME = $(this).closest('[data-id]').attr('data-id');
        },
        /*
         * Получить название текущей ПС
         * @returns {string} название платежной системы
         */
        get_current_ps_name: function () {
            return $(plugin_init_data[PLUGIN_NAME].input_form).find('input#' + ID_PS_HIDDEN_NAME).val();
        },
        /*
         * Получить название текущей ПС
         * @returns {string} название платежной системы
         */
        get_ps_additional_fields_by_ps_name: function (ps_name) {
            return $('.js_ps_additional_field.is_active.' + ps_name + ' input');
        },
        /*
         * Проверяем элемент на видимость. Если он не видим - то проверим на бекэнде
         * @returns {boolen}
         */
        is_visible: function () {
            return $(this).is(':visible');
        },
        /*
         * Загрузка общей страницы выбора платежной страницы. Не подлежит изменению классы, начинающиеся на js
         */
        init_common_payment_page: function () {
            /**
             * Скрытие подсказки о поле ввода при нажатии на любое место
             */
            $(document).on('click', function () {
                $('.js_input_field_info').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                $('.js_header_order_info').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            });

            $(window).bind('hashchange', function () {
                methods.load_tabs();
            });

            $('.js_payment_system_item').on('click', function () {
                methods.select_simple_payment_system.apply(this);
            });

            $('.js_input_field_info_btn').on('click', function (event) {
                methods.load_info_input.apply(this, [event]);
            });

            if ($('.js_email_input').val()) {
                methods.hide_email_checkbox();
            }
            else {
                methods.load_email_checkbox();
            }

            /**
             * Вешается обработчик для мобильной версии на скрытие меню в случае клика в любое место
             */
            $('.js_overlay').on('click', function () {
                $('body').removeClass('is_open_menu');
            });

            /**
             * Вешается обработчик для мобильной версии на клик по меню или разделу меню
             */
            $('.js_menu, .js_selected_tab_name').on('click', function () {
                $('body').toggleClass('is_open_menu');
            });

            $(document).ready(function () {
                methods.load_postpone_form();
                methods.load_tabs();
            });
        },
        /**
         * Обработка нажатия на вкладку и смену группы + изменение суммы во вкладке
         * Изменение табуляции работает через изменение hash. По нажатии на ссылке изменяется хэш. По нему меняется tab
         */
        load_tabs: function () {
            var hash = window.location.hash;

            // Если была выбрана уже категория
            if (hash) {
                $('[href="' + hash + '"]').parents('.js_tab').find('.js_tab_content').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                $('[data-id="' + hash + '"]').addClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                $('[href="' + hash + '"]').parents('.js_tab_catgories').find('li').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                $('[href="' + hash + '"]').parent().addClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);

                active_simple_ps = $('[data-id="' + hash + '"]').find('.js_payment_system_item:first');
                tabText = $('.js_tab_catgories').find('li.' + COMMON_PAYMENT_FORM_ACTIVE_CLASS + ' a').text();
                $('.js_selected_tab_name').text(tabText);
            }
            else {
                $('.js_tab_catgories').find('li').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                $('.js_tab').find('.js_tab_content').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                
                window.location.hash = $('.js_tab_catgories').find('li:first a').attr('href');
                
                active_simple_ps = $('.js_tab').find('.js_tab_content:first').find('.js_payment_system_item');
                tabText = $('.js_tab_catgories').find('li:first a').text();
                $('.js_selected_tab_name').text(tabText);
            }

            // Удаление активной ссылки группы при нажатии
            $('.js_tab_catgories').find('li a').on('click', function () {
                $('body').removeClass('is_open_menu');
            });

            methods.select_simple_payment_system.apply(active_simple_ps);
        },
        /**
         * Отображение информации при клике на знак вопроса на картинке
         */
        load_info_input: function (event) {
            $('.js_header_order_info').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            var parent = $(this).parent('.js_input_field_info');

            if (parent.hasClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS)) {
                parent.removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            }
            else if ($('.js_input_field_info').hasClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS)) {
                $('.js_input_field_info').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
                parent.addClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            }
            else {
                parent.toggleClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            }

            event.stopPropagation();
        },
        /**
         * Изменение суммы, валюты при выборе ПС. Отображение до полей.
         */
        select_simple_payment_system: function () {
            var active_ps = this;
            var visible_ps_name = $(active_ps).find('.js_hidden_ps_name').html();
            var total_amount_currency = $(active_ps).find('.js_inner_ps_price').html();

            $('.js_payment_system_item').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            $(active_ps).addClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);

            // Показать / скрыто дополнительные поля ПС
            $('.js_ps_additional_field').removeClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);
            $('.js_ps_additional_field.' + visible_ps_name).addClass(COMMON_PAYMENT_FORM_ACTIVE_CLASS);

            // Изменение итоговой стоимость внутри страницы
            $('.js_checkout').find('.price').html(total_amount_currency);

            // Установка платежной системы для сабмита формы
            $(active_ps).parent('.js_payment_in').find('input').val(visible_ps_name);
        },
        /**
         * Отображение информации при клике на знак вопроса на картинке
         */
        load_email_checkbox: function () {
            $('.js_email_send_checkbox').on('change', function (event) {
                event.preventDefault();
                var email = $('.js_myemail');

                if ($(this).is(':checked')) {
                    email.show();
                    $('.js_email_send_checkbox').attr('checked', 'checked');
                }
                else {
                    email.hide();
                    $('.js_email_send_checkbox').removeAttr('checked');
                }

            });
        },
        /**
         * Отображение email и скрытие возможности не присылать уведомление пользователю
         */
        hide_email_checkbox: function () {
            // Копирование email в аналогичные поля других форм
            $('.js_email_input').on('input', function () {
                $('.js_email_input').val($(this).val());
            });

            // Если в транзакции есть email - не скрываем его
            if ($('.js_email_input').val()) {
                $('.js_myemail').show();
                $('.js_email_checkbox').hide();
            }
            ;
        },
        /**
         * Обработка формы для отложенного платежа. Открытие / скрытие
         */
        load_postpone_form: function () {
            $('.js_popup_pospone_open').on('click', function () {
                $('body').addClass('is_open_popup');
            });
            $('.js_popup_postpone, .js_popup_pospone_close').on('click', function () {
                $('body').removeClass('is_open_popup');
                return false;
            });
            $('.js_popup_postpone_content').click(function (event) {
                event.stopPropagation();
            });
        }
    };

    /*
     * Входная точка в плагин. Она вызывается из платежных страниц
     */
    $.fn.payment_form = function (method) {
        methods.set_plugin_name.apply(this);
        if (methods[method]) {
            var _return = methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            // opera not support paste event
            if (isOpera) {
                if (typeof fields.card_num_fields !== undefined)
                    fields.card_num_fields.attr(MAXLENGTH_ATTRIBUTE, fields.card_num_fields_total_lengths);
                if (typeof fields.exp_date_fields !== undefined)
                    fields.exp_date_fields.attr(MAXLENGTH_ATTRIBUTE, fields.exp_date_fields_total_lengths);
            }
            return _return;
        }
        else if (typeof method === 'object' || !method) {
            var _return = methods.init.apply(this, arguments);
            // opera not support paste event
            if (isOpera) {
                if (typeof fields.card_num_fields !== undefined)
                    fields.card_num_fields.attr(MAXLENGTH_ATTRIBUTE, fields.card_num_fields_total_lengths);
                if (typeof fields.exp_date_fields !== undefined)
                    fields.exp_date_fields.attr(MAXLENGTH_ATTRIBUTE, fields.exp_date_fields_total_lengths);
            }
            return _return;
        }
        else {
            $.error('Метод с именем ' + method + ' не существует для jQuery.payment_form');
        }
    };

})(jQuery);

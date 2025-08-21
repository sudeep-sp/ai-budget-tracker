export const currencies = [
    { value: "USD", label: "$ Dollar", locale: "en-US" },
    { value: "EUR", label: "€ Euro", locale: "de-DE" },
    { value: "GBP", label: "£ Pound Sterling", locale: "en-GB" },
    { value: "JPY", label: "¥ Yen", locale: "ja-JP" },
    { value: "AUD", label: "$ Australian Dollar", locale: "en-AU" },
    { value: "CAD", label: "$ Canadian Dollar", locale: "en-CA" },
    { value: "CHF", label: "CHF Swiss Franc", locale: "de-CH" },
    { value: "CNY", label: "¥ Chinese Yuan", locale: "zh-CN" },
    { value: "SEK", label: "kr Swedish Krona", locale: "sv-SE" },
    { value: "NZD", label: "$ New Zealand Dollar", locale: "en-NZ" },
    { value: "INR", label: "₹ Indian Rupee", locale: "en-IN" },
    { value: "RUB", label: "₽ Russian Ruble", locale: "ru-RU" },
    { value: "BRL", label: "R$ Brazilian Real", locale: "pt-BR" },
    { value: "MXN", label: "$ Mexican Peso", locale: "es-MX" },
    { value: "ZAR", label: "R$ South African Rand", locale: "af-ZA" },
    { value: "SGD", label: "$ Singapore Dollar", locale: "en-SG" }
]

export type Currency = (typeof currencies)[0];
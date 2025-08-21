import { currencies } from "./currencies";

export function DateToUTCD(date: Date) {
    return new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds(),
            date.getUTCMilliseconds()
        )
    );
}

export function GetFormatterForCurrency(currency: string) {
    const locale = currencies.find(c => c.value === currency)?.locale;

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency
    })
}
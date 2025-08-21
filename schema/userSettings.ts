import { currencies } from "@/lib/currencies";
import { z } from "zod/v3";

export const UpdateUserCurrencySchema = z.object({
    currency: z.custom(value => {
        const found = currencies.some(c => c.value === value);
        if (!found) {
            throw new Error(`Invalid currency: ${value}`);
        }
        return value;
    })
});

import type { AnonymizeRequest, MaskConfig } from './schemas';

/**
 * SHA-256ハッシュ化
 */
export function hashValue(value: unknown, salt?: string): string {
    const str = String(value);
    const input = salt ? salt + str : str;
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(input);
    return hash.digest('hex');
}

/**
 * HMAC-SHA256ハッシュ化
 */
export function hmacValue(value: unknown, secretKey: string): string {
    const str = String(value);
    const hmac = new Bun.CryptoHasher('sha256', secretKey);
    hmac.update(str);
    return hmac.digest('hex');
}

/**
 * フィールドをマスキング
 */
export function maskValue(value: unknown, config: MaskConfig): string {
    const str = String(value);
    const mask = config.maskChar;

    switch (config.keep) {
        case 'first1':
            return str.slice(0, 1) + mask.repeat(Math.max(0, str.length - 1));
        case 'first2':
            return str.slice(0, 2) + mask.repeat(Math.max(0, str.length - 2));
        case 'last4':
            return mask.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
        case 'domain': {
            const atIndex = str.indexOf('@');
            if (atIndex > 0) {
                return mask.repeat(atIndex) + str.slice(atIndex);
            }
            return mask.repeat(str.length);
        }
        default:
            return mask.repeat(str.length);
    }
}

/**
 * 年齢を範囲に一般化
 */
export function generalizeAge(age: number, ranges?: number[]): string {
    if (typeof age !== 'number' || Number.isNaN(age)) {
        return 'unknown';
    }

    const defaultRanges = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const ageRanges = ranges ?? defaultRanges;

    for (let i = 0; i < ageRanges.length - 1; i++) {
        const min = ageRanges[i];
        const max = ageRanges[i + 1] - 1;
        if (age >= min && age <= max) {
            return `${min}-${max}`;
        }
    }

    if (age >= ageRanges[ageRanges.length - 1]) {
        return `${ageRanges[ageRanges.length - 1]}+`;
    }

    return 'unknown';
}

/**
 * 日付を一般化
 */
export function generalizeDate(dateValue: unknown, precision: 'month' | 'year'): string {
    let date: Date;

    if (dateValue instanceof Date) {
        date = dateValue;
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
    } else {
        return 'unknown';
    }

    if (Number.isNaN(date.getTime())) {
        return 'unknown';
    }

    if (precision === 'year') {
        return String(date.getFullYear());
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 郵便番号を一般化
 */
export function generalizePostalCode(value: unknown, keepDigits: number = 3): string {
    const str = String(value).replace(/[^0-9]/g, '');
    const digits = Math.max(1, keepDigits);
    return `${str.slice(0, digits)}-XXXX`;
}

/**
 * データを匿名化
 */
export function anonymize(request: AnonymizeRequest): Record<string, unknown> {
    const { data, config } = request;
    let result = { ...data };

    // 許可リストが指定されている場合、それ以外を削除
    if (config.allowlist && config.allowlist.length > 0) {
        const allowed = new Set(config.allowlist);
        result = Object.fromEntries(Object.entries(result).filter(([key]) => allowed.has(key)));
    }

    // 削除
    if (config.redact) {
        for (const field of config.redact) {
            delete result[field];
        }
    }

    // ハッシュ化
    if (config.hash) {
        for (const field of config.hash) {
            if (field in result) {
                result[field] = hashValue(result[field], config.hashSalt);
            }
        }
    }

    // HMAC
    if (config.hmac) {
        for (const field of config.hmac.fields) {
            if (field in result) {
                result[field] = hmacValue(result[field], config.hmac.secretKey);
            }
        }
    }

    // マスキング
    if (config.mask) {
        for (const maskConfig of config.mask) {
            if (maskConfig.field in result) {
                result[maskConfig.field] = maskValue(result[maskConfig.field], maskConfig);
            }
        }
    }

    // 年齢一般化
    if (config.generalizeAge) {
        const field = config.generalizeAge.field;
        if (field in result) {
            result[field] = generalizeAge(result[field] as number, config.generalizeAge.ranges);
        }
    }

    // 日付一般化
    if (config.generalizeDate) {
        const field = config.generalizeDate.field;
        if (field in result) {
            result[field] = generalizeDate(result[field], config.generalizeDate.precision);
        }
    }

    // 郵便番号一般化
    if (config.generalizePostalCode) {
        const field = config.generalizePostalCode.field;
        if (field in result) {
            result[field] = generalizePostalCode(result[field], config.generalizePostalCode.keepDigits);
        }
    }

    return result;
}
